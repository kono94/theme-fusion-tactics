# TFT Deployment Guide

Simple GitOps deployment to Hetzner VPS.

---

## Quick Reference

| Command | What it does |
|---------|--------------|
| `docker compose --profile dev up` | Local dev (HTTP) |
| `docker compose --profile prod up -d` | Production (HTTPS) |
| `git tag 1.0.0 && git push origin 1.0.0` | Trigger GitOps deploy |

Operational telemetry and gameplay analytics are available together at `https://<your-domain>/grafana/`. The legacy
application analytics view remains available at `https://<your-domain>/#/admin/analytics`.

---

## Files

```
deployment/
├── cloud-init.yaml       # Paste into Hetzner when creating VPS
├── initial-setup.sh       # Run once after first SSH
├── deploy.sh             # Called by GitOps on each deploy
├── observability/         # Collector, Mimir, Loki, and Grafana configuration
└── nginx/
    ├── dev.conf          # Local development (HTTP)
    ├── prod.conf.template # Production template (HTTPS)
    └── acme.conf         # SSL certificate bootstrap
```

---

## One-Time Setup

### 1. Generate SSH Keys

```bash
# Your admin key
ssh-keygen -t ed25519 -f ~/.ssh/id_tft_admin

# GitHub Actions deploy key
ssh-keygen -t ed25519 -f ~/.ssh/id_tft_deploy
```

### 2. Edit cloud-init.yaml

Replace the placeholders:
```
<YOUR_ADMIN_SSH_KEY>        → cat ~/.ssh/id_tft_admin.pub
<YOUR_GITHUB_ACTION_SSH_KEY> → cat ~/.ssh/id_tft_deploy.pub
```

### 3. Create VPS

1. Hetzner Console → Create Server
2. OS: Ubuntu 24.04
3. Paste `cloud-init.yaml` in Cloud config
4. Create and note the IP

### 4. Configure DNS

Add A record: `tft.yourdomain.com` → `<SERVER_IP>`

Wait 5-10 min for propagation.

### 5. GitHub Secrets

Repo → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `SERVER_IP` | Your server IP |
| `SSH_PRIVATE_KEY` | Content of `~/.ssh/id_tft_deploy` (private key!) |

### 6. First-Time Server Setup

```bash
# SSH in (wait ~2 min for cloud-init to finish)
ssh -p 2222 deployer@<SERVER_IP> -i ~/.ssh/id_tft_admin

# Run setup wizard
bash /opt/tft/deployment/initial-setup.sh
```

The wizard requires the gameplay analytics password plus a separate Grafana admin password, generates a random Grafana
secret key, and creates the persistent SQLite data directory at `/var/lib/tft/analytics`.

### Upgrade an existing server

Servers initialized before analytics was added need the persistent directory:

```bash
sudo mkdir -p /var/lib/tft/analytics
sudo chown 472:0 /var/lib/tft/analytics
sudo chmod 2770 /var/lib/tft/analytics
```

Add the password to `/opt/tft/.env`:

```dotenv
SPRING_PROFILES_ACTIVE=prod
ANALYTICS_ADMIN_PASSWORD=choose-a-strong-password
```

Servers initialized before 2.4.5 must also add these required values before deployment; `deploy.sh` intentionally fails
preflight when any is absent:

```dotenv
GRAFANA_ROOT_URL=https://tft.yourdomain.com/grafana/
GRAFANA_ADMIN_PASSWORD=choose-a-different-strong-password
GRAFANA_SECRET_KEY=<output-of-openssl-rand-hex-32>
```

Generate the secret with `openssl rand -hex 32`. Do not reuse the gameplay analytics password. Mimir, Loki, Grafana,
and the Collector persist their state in Docker named volumes created automatically by Compose.

## Observability Architecture

```text
Java agent ──OTLP metrics──┐
Java agent ──OTLP logs─────┼─> OpenTelemetry Collector ──OTLP──> Mimir / Loki
native hostmetrics─────────┤
stack /metrics scrapes─────┘
                                            Grafana ──> Mimir / Loki
SQLite gameplay analytics ─────────────────────┘
```

- The application uses native OpenTelemetry metrics, automatic JVM/HTTP metrics, and automatic Logback export. It does
  not use Micrometer, Actuator, or Logstash. WebSocket connections are counted by bounded browser, operating-system,
  and device families without exporting raw user-agent strings or browser versions. Custom transport metrics report
  STOMP message outcomes and sizes, explicit backpressure events, and server-side game-action processing latency.
- Host CPU, memory, load, root filesystem bytes/inodes, disk I/O, paging, and network metrics come from the Collector's
  native `hostmetrics` receiver. `/`, `/proc`, and `/sys` are visible through a read-only host mount; neither privileged
  mode nor the Docker socket is used.
- Prometheus is not a transport or backend in this stack. The Collector only uses its Prometheus receiver to read the
  `/metrics` endpoints already exposed by the Collector, Mimir, Loki, and Grafana, then sends those metrics to Mimir as
  OTLP alongside native host metrics.
- Metrics are retained for 30 days and logs for 7 days. This is a single-replica, single-tenant deployment intended for
  one Linux Docker host. On Docker Desktop, host panels describe Docker's Linux VM.
- Tracing is explicitly disabled. There is no traces pipeline, Tempo service, or trace datasource.
- Grafana uses the pinned `frser-sqlite-datasource` plugin to query the existing gameplay analytics database. The
  datasource is non-editable and SQLite query-only mode blocks mutations. Its host directory remains writable by
  Grafana because a live SQLite WAL reader must be able to manage the `-shm` sidecar file. The set-group-ID directory
  and the backend's group-writable umask keep newly created database, WAL, and shared-memory files accessible to both
  containers.

All observability ports remain internal to the Compose network. Nginx is the only public entry point and proxies Grafana
under `/grafana/`, including WebSocket upgrades.

The deployment uses the official, digest-pinned Grafana image. On the first startup for a new `grafana-data` volume,
Grafana downloads the pinned SQLite plugin before provisioning datasources. That startup therefore needs registry/plugin
network access once; the installed plugin then persists in the named volume. A custom image is intentionally avoided.

---

## Deploy Updates

Push a tag:
```bash
git tag 1.0.0
git push origin 1.0.0
```

---

## Troubleshooting

### Access the legacy application analytics dashboard

Open `https://<your-domain>/#/admin/analytics` and enter the password stored as
`ANALYTICS_ADMIN_PASSWORD` in `/opt/tft/.env`. Successful login creates an eight-hour bearer session in that browser
tab. Logging out, closing the tab, restarting the backend, or allowing the session to expire requires another login.

To change the password, edit `/opt/tft/.env` and recreate the backend container:

```bash
docker compose --profile prod up -d --force-recreate backend
```

### Access Grafana

Open `https://<your-domain>/grafana/` and sign in as `admin` with `GRAFANA_ADMIN_PASSWORD`. Anonymous access and user
signup are disabled. The repository provisions read-only Mimir and Loki datasources, a non-editable query-only SQLite
datasource, and three dashboards:

- `TFT Overview` for application, JVM, host, collector, storage, logs, and active-client telemetry;
- `TFT Gameplay Analytics` for the existing gameplay summary, build/mode/player filters, distributions, final-composition
  unit presence, and player runs;
- `TFT Gameplay Run` for linked per-run round snapshots, boards, augments, and unit combat statistics.

Dashboard edits made in the UI are intentionally not persisted over repository provisioning. Selecting a run ID in the
gameplay dashboard opens its drill-down. The SQLite mount is writable only to support WAL shared-memory bookkeeping;
the plugin enforces query-only access. Treat Grafana accounts as trusted analytics administrators.

The overview is tuned for this deployment's low traffic volume: action, connection, rejection, lifecycle, and
WebSocket panels use per-minute or rolling-window values instead of mostly-zero per-second rates. `Action latency:
server vs browser` compares server-side STOMP validation and room mutation with the browser's monotonic publish-to-
acknowledgement round trip. A browser-only spike points to tab scheduling, network, or transport delay rather than game
logic.
HTTP latency remains useful for the REST pages and the WebSocket handshake, but gaps are normal while gameplay traffic
flows over STOMP. The JVM chart intentionally shows heap only; non-heap memory is used by class metadata, JIT-compiled
code, and other runtime structures and is not directly comparable with the heap limit. Root filesystem capacity and
inode usage are both shown as percentages.

The VPS refresh failure is Mimir rejecting overlapping dashboard queries with HTTP 429 after the single tenant reaches
the query scheduler's outstanding-request limit. The configured limit of 512 accommodates a complete overview refresh
plus short manual-refresh bursts, while the 30-second dashboard refresh reduces overlap. This is targeted queue
protection for dashboard bursts, not a general Mimir health fix; ring heartbeat and auto-forget settings remain at their
defaults.

Production deploys hash `deployment/observability/mimir/config.yaml` and place the digest in the Mimir service label.
Compose therefore recreates Mimir when that configuration changes without restarting it on unrelated deploys. For a
manual local rollout, recreate it explicitly:

```bash
docker compose up -d --force-recreate mimir
```

Validate the repository configuration with the pinned binary before deploying:

```bash
docker run --rm \
  -v "$PWD/deployment/observability/mimir/config.yaml:/etc/mimir/config.yaml:ro" \
  grafana/mimir:3.2.1@sha256:92838f113ba54230014e79bc812e57ca90bb9ebc06e665f59e4f700098c2dd04 \
  -config.file=/etc/mimir/config.yaml -modules
```

After deployment, confirm the running process loaded the effective value:

```bash
docker compose exec -T grafana curl -fsS http://mimir:9009/config \
  | grep -A 1 '^query_scheduler:'
```

The output must show `max_outstanding_requests_per_tenant: 512`. Repeated Grafana refreshes should then complete
without Mimir query-scheduler 429 responses.

`Observability targets healthy` reports successful metric scrapes, not merely running Compose containers. If it is below
four, use the adjacent target-status table to identify whether the Collector, Mimir, Loki, or Grafana endpoint is not
being scraped successfully.

To rotate the Grafana password or secret key, update `/opt/tft/.env` and recreate Grafana. Changing the secret key logs
out existing sessions:

```bash
docker compose --profile prod up -d --force-recreate grafana
```

### Check telemetry health

```bash
docker compose ps
docker compose logs --tail=100 otel-collector mimir loki grafana
```

The dashboard should show application metrics after the backend's first 15-second export. Host and stack metrics do not
depend on application traffic. If application data is absent, confirm the backend starts with
`-javaagent:/otel/opentelemetry-javaagent.jar` and that the one-shot `otel-javaagent` service exited successfully.

### GitHub deploy fails with `insufficient permission for adding an object`

The forced deploy user must own the repository metadata under `/opt/tft/.git`. This
can break if Git commands are run manually with `sudo`.

```bash
ssh -p 2222 deployer@<SERVER_IP> -i ~/.ssh/id_tft_admin
sudo chown -R github-deployer:github-deployer /opt/tft/.git
```

### Browser sees an expired certificate after certbot renewed it

Nginx needs to reload after certbot writes a renewed certificate.

```bash
ssh -p 2222 deployer@<SERVER_IP> -i ~/.ssh/id_tft_admin
sudo docker exec tft-nginx nginx -s reload
```

---

## SSH Config (Recommended)

Add to `~/.ssh/config`:
```
Host tft
  HostName <SERVER_IP>
  User deployer
  Port 2222
  IdentityFile ~/.ssh/id_tft_admin
```

Then: `ssh tft`
