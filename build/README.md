# Build and development

The player overview and browser play instructions are in the [README](../README.md). Start changes with
[AGENTS.md](../AGENTS.md), [backend context](../backend/BACKEND_CONTEXT.md), and
[frontend context](../frontend/FRONTEND_CONTEXT.md). Those documents own coding conventions,
architecture, and API contracts.

## Run from source

Install Java 25, Maven, Node 26+, and npm. Docker is optional for running the stack; it is required
for the repository's dependency-inventory workflow.

Start the backend in one terminal:

```sh
cd backend
mvn spring-boot:run
```

Start the frontend in another:

```sh
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite proxies REST and WebSocket traffic to the backend on port 8080.
New rooms begin in One Piece mode; the host can select Pokémon before starting the match.

For the Docker development stack, run from the repository root:

```sh
docker compose --profile dev up --build
```

Open `http://localhost`. Monitoring is available at `http://localhost/grafana/` with the local
`admin` / `admin` credentials. Production requires the secrets in `.env.example`; follow the
[hosted deployment guide](../deployment/DEPLOYMENT_GUIDE.md) for setup and storage.
The [backend observability context](../backend/BACKEND_CONTEXT.md#11-observability) describes
telemetry and dashboard ownership.

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
