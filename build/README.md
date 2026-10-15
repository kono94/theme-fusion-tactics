# Build and development

The player overview and browser play instructions are in the [README](../README.md). Start changes with
[AGENTS.md](../AGENTS.md), [backend context](../backend/BACKEND_CONTEXT.md), and
[frontend context](../frontend/FRONTEND_CONTEXT.md). Those documents own coding conventions,
architecture, and API contracts.

## Run from source

Install a Java 25 JDK, Maven, Node 26+, and npm. Docker is optional for running the stack; it is required
for the repository's dependency-inventory workflow.

Start the backend in one terminal:

```sh
cd backend
mvn spring-boot:run -Dspring-boot.run.jvmArguments=--enable-preview
```

Start the frontend in another:

```sh
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite proxies REST and WebSocket traffic to the backend on port 8080.
New rooms begin in One Piece mode; the host can select Pokémon before starting the match.
The backend and frontend run as separate processes. Match history is stored in
`backend/data/analytics.db`; live matches are held in memory. Monitoring services are supplied
by the Compose stack rather than these source commands.

## Run the Docker development stack

For the Docker development stack, run from the repository root:

```sh
docker compose --profile dev up --build
```

Open `http://localhost`. Monitoring is available at `http://localhost/grafana/` with the local
`admin` / `admin` credentials on a fresh volume using the default development settings.
Leave a production `.env` out of this checkout: it overrides localhost origins, server profiles,
and Grafana URLs. If you need an environment file, use a separate development file with
Compose's `--env-file` option.

Compose binds the host directory `/var/lib/tft/analytics` for shared backend/Grafana access.
That directory must be available to Docker; on Docker Desktop it may need file-sharing setup.
Source-based development above uses `backend/data/` instead.

Production requires the secrets in [.env.example](../.env.example); follow the
[hosted deployment guide](../deployment/DEPLOYMENT_GUIDE.md) for setup and storage.
The [backend observability context](../backend/BACKEND_CONTEXT.md#11-observability) describes
telemetry and dashboard ownership.

## Deploy to a VPS

The production stack serves the frontend through nginx and proxies REST and WebSocket traffic
to the Java backend. The [deployment guide](../deployment/DEPLOYMENT_GUIDE.md) covers server
bootstrap, HTTPS certificates, and GitHub SSH secrets.

Pushing to `main` runs backend/frontend CI. Pushing a tag runs the same checks and then asks
the configured VPS to deploy that tag. The server builds the Docker images through
`deployment/deploy.sh` and validates and reloads nginx. Backend restarts end active matches;
the server's SQLite history remains on disk.

## Verify changes

Run backend commands from `backend/`:

```sh
mvn spotless:apply
mvn verify
```

Run frontend commands from `frontend/`:

```sh
npm test
npm run lint
npm run build
# Optional coverage report
npm run test:coverage
```

## Balance reports

Run from `backend/`. Reports are opt-in because large simulations are expensive; outputs go to
`target/simulation-reports`.

```sh
# Same-star boards; use -Dsimulation.mode=pokemon for Pokémon
mvn -Dtest=BalanceSimulationReportTest -Dsimulation.mode=onepiece -Dsimulation.report=true -Dsimulation.runs=1000000 -Dsimulation.threads=8 test

# Random star levels with the same board-building rules
mvn -Dtest=BalanceSimulationReportTest -Dsimulation.report=true -Dsimulation.runs=1000000 -Dsimulation.threads=8 -Dsimulation.style=random-stars test

# Random board sizes, units, stars, and positions
mvn -Dtest=BalanceSimulationReportTest -Dsimulation.report=true -Dsimulation.runs=1000000 -Dsimulation.threads=8 -Dsimulation.style=random-boards test

# Balanced roles versus Damage-only boards
mvn -Dtest=RoleBalanceSimulationTest -Dsimulation.role-report=true -Dsimulation.runs=100000 -Dsimulation.seed=42 test
```

The board reports include unit and trait rankings for sizes 2–8. Role comparisons keep Damage-only
boards viable at size 3, require a balanced advantage from size 4, and target at least 65% balanced
wins at sizes 6–7. These controlled simulations are not estimates of human win rates.
