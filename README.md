# Production-Ready Turborepo Monorepo

A production-ready Turborepo monorepo boilerplate featuring Next.js 15, Express backend with Node.js cluster mode, and a hybrid database strategy (PostgreSQL + MongoDB + Redis). Built with security-first principles and designed for 100K+ concurrent users.

## Tech Stack

**Monorepo Tooling:**
- Turborepo 1.12+ (build orchestration with caching)
- pnpm 9+ (efficient package management)

**Frontend (`apps/web`):**
- Next.js 15 (App Router)
- React 19
- Zustand 5 (state management)
- React Query 5 (server state & caching)
- TypeScript 5.3+

**Backend (`apps/api`):**
- Node.js 20+ with Cluster mode (horizontal scaling)
- Express 4.18+ (REST API)
- TypeScript 5.3+
- Clean/Hexagonal Architecture

**Database Strategy:**
- **PostgreSQL**: Prisma (ORM) + pg-pool (raw SQL for performance-critical queries)
- **MongoDB**: Mongoose (document store)
- **Redis**: ioredis (caching + rate limiting)

**Security & Resilience:**
- Helmet (HTTP security headers)
- express-rate-limit with Redis backend
- Zod (schema validation)
- opossum (Circuit Breaker pattern)
- CORS (restrictive, environment-based)
- Trufflehog (secret scanning)
- eslint-plugin-security (SAST)

**Deployment:**
- Frontend: Vercel (recommended)
- Backend: Render / Railway (containerized)
- Database: Railway / Supabase

## Prerequisites

- Env-backed access to PostgreSQL/PostGIS, Redis, and the worker process
- **Node.js** 20+
- **pnpm** 9+

## Quick Start

### 1. Clone and Setup
```bash
git clone <repo-url>
cd output-boilerplate
cp .env.example .env
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Start the env-backed services and API

Provide API, PostgreSQL/PostGIS, Redis, and worker endpoints/processes through the operator environment or process manager. Readiness and real service calls are the only proof authority; missing services remain `blocked` or `not_run`.

Use the exact application commands:

```bash
cd backend && pnpm run dev
cd frontend && pnpm run dev
```

The thin delegates resolve to `apps/api` and `apps/web`; the web app reaches the API through its server-side BFF and never connects directly to the database.

### 4. Start Frontend (when using package-scoped commands)
```bash
pnpm --filter web dev
```

Frontend will be available at `http://localhost:3000`.

### 5. Run Tests
```bash
make test
```

### 6. Run Security Checks
```bash
make secure
```

## Project Structure

```
output-boilerplate/
├── apps/
│   ├── web/                    # Next.js 15 frontend
│   └── api/                    # Express backend (Clean Architecture)
├── packages/
│   ├── eslint-config/          # Shared ESLint configuration
│   ├── typescript-config/      # Shared TypeScript configuration
│   └── zod-schemas/            # Shared validation schemas (E2E type safety)
├── turbo.json                  # Turborepo pipeline config
├── pnpm-workspace.yaml
├── Makefile
├── README.md
├── ARCHITECTURE.md
└── .ai-manifest.md
```

## Available Commands

```bash
make help        # Show all available commands
make install     # Install dependencies
 make test        # Run all tests
make lint        # Run linters
make secure      # Run security checks (secrets + audit)
make clean       # Clean up (removes volumes and node_modules)
```

## Development Workflow

1. Make changes to code
2. Run `make test` to ensure tests pass
3. Run `make lint` to check code quality
4. Run `make secure` before committing to scan for vulnerabilities
5. Commit and push (CI will run additional security checks)

## Deployment

### Frontend (Vercel)
1. Push to GitHub
2. Connect repository to Vercel
3. Set environment variables: `NEXT_PUBLIC_API_URL`
4. Deploy

### Backend (Render)
1. Push to GitHub
2. Create a new Web Service on Render
3. Set build command: `pnpm install && pnpm --filter api run build`
4. Set start command: `pnpm --filter api start`
5. Add environment variables: `DATABASE_URL`, `MONGODB_URL`, `REDIS_URL`, `CORS_ORIGINS`, `AGRONAUTAS_ROUTE_PREFIX`, `AGRONAUTAS_RUNTIME_MODE`, `TRUST_PROXY`, `AGRONAUTAS_RUNTIME_REQUIRED`, `AGRONAUTAS_WORKER_HEARTBEAT_MAX_AGE_SECONDS`

### Database (Railway)
1. Create PostgreSQL, MongoDB, and Redis services
2. Copy connection strings to your environment variables

## Security Features

✅ **Non-root runtime images**: Runtime images use unprivileged users
✅ **Secret scanning**: Trufflehog integration in CI  
✅ **SAST**: ESLint Security plugin for static analysis  
✅ **Dependency auditing**: Automated npm audit in CI  
✅ **Rate limiting**: Redis-backed rate limiting per IP  
✅ **CORS**: Restrictive, environment-based origins  
✅ **Helmet**: HTTP security headers  
✅ **Circuit Breaker**: Fault tolerance for external services  

## Health Checks

- `GET /health` and `GET /agronautas/health` - Basic liveness check
- `GET /ready` and `GET /agronautas/ready` - Readiness check (Postgres/Redis required; Mongo optional by default; worker required only when `AGRONAUTAS_RUNTIME_REQUIRED=true`)

## Agronautas deploy notes

- Backend routes are mounted under `AGRONAUTAS_ROUTE_PREFIX` (default `/agronautas`) to match frontend calls.
- `GET /agronautas/runtime` exposes backend-driven mode resolution: `real` or `demo`.
- Demo mode is controlled on the backend with `AGRONAUTAS_RUNTIME_MODE=demo`; the frontend keeps a single API service and only tests use local mocks.
- Set `TRUST_PROXY=true` (or a numeric/string Express value) when the API is behind Render/Railway/Vercel proxies so rate limiting uses forwarded IPs correctly.
- `CORS_ORIGINS` accepts exact comma-separated origins and exposes `X-Agronautas-Mode` for runtime inspection.
- Before release, validate the hardening gate with focused API and web suites; these checks do not replace live service evidence.
- `apps/web/tests/e2e/agronautas-production.spec.js` remains supplemental documentation smoke. The release gate is the API/web integration lane plus env-backed Postgres/PostGIS, Redis, worker, and browser readiness evidence.
- For local runtime acceptance, provide the API, Postgres/PostGIS, Redis, and worker processes through environment variables or process configuration, start the API and web with the exact commands above, then run `pnpm verify:agronautas:runtime` and `pnpm verify:agronautas:browser`. The API harness records run-linked JSON evidence under `apps/api/artifacts/agronautas-runtime/`; the browser lane records screenshot, HTML, network, console, and manifest evidence under `apps/web/test-results/`.
- Real runtime checks never convert unavailable prerequisites into success: worker/queue/cron/Render/hydrology states are recorded as `blocked` or `not_run` when their authorization or live dependency is absent. Hydrology writes require `HYDROLOGY_CRON_OWNER_ID` plus the configured token; no fake dry-run is used. Open-Meteo commercial-use checks require explicit `AGRONAUTAS_OPEN_METEO_COMMERCIAL_APPROVED=true`.
- The real browser lane is `apps/web/tests/e2e/agronautas-reality-runtime.spec.ts`; it uses actual API/BFF traffic and does not install Playwright route stubs. Runtime evidence is local acceptance evidence only and records `productionProven: false`.
- Playwright's default no-`PLAYWRIGHT_BASE_URL` execution is labeled `managed-playwright-harness` and starts only temporary API/web processes. Its BFF/provider evidence is real, but it is not full DB/Redis/worker/cron/Render topology proof; each missing surface remains explicitly blocked, unavailable, or not run. Captured hydration mismatches are runtime warnings, not clean-console evidence.
- Keep `env.env` and `apps/api/tsconfig.tsbuildinfo` out of commits; they are local/generated artifacts, not release inputs.

## Production-simple launch contract

`render.yaml` is the checked-in deployment manifest. [`docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md`](docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md) is the operator runbook. The owner-selected production Cron model is the direct `scheduler:once` runner; the production gate remains **blocked** until that exact Render execution is live-proven. Local proof is never promoted to production evidence.

### Local command boundary

Before API/web proof, provide the required Postgres/PostGIS, Redis, and worker services through env-backed endpoints/processes and confirm them with bounded readiness checks. There is no hidden infrastructure launcher. Missing or unreachable services stop dependent checks and are recorded as `blocked` or `not_run`.

```bash
cd backend && pnpm run dev
cd frontend && pnpm run dev
```

The `backend` and `frontend` commands are thin delegates to `apps/api` and `apps/web`; neither owns a database connection or bypasses the web BFF. Apply additive migrations and query `/health` and `/ready` before recording runtime evidence.

### Render service boundaries

| Service | Health/readiness boundary | Required production policy | Evidence meaning |
|---|---|---|---|
| `agronautas-api` | Render health check `/health`; operator gate `/ready` | `AGRONAUTAS_AUTH_ENABLED=true`, `AGRONAUTAS_RUNTIME_REQUIRED=true`, `TRUST_PROXY=1`, explicit bounded readiness timeout and worker heartbeat age | Liveness is not readiness; `/ready` must observe Postgres, Redis, migrations/PostGIS, and a fresh worker heartbeat. |
| `agronautas-web` | Render health check `/`; server-only BFF under `/api/agronautas/*` | `AGRONAUTAS_API_INTERNAL_URL` is a non-local origin supplied by named environment reference; `AGRONAUTAS_BFF_BEARER_TOKEN` is server-only; timeout is bounded at `60000` ms | Browser traffic never receives the API bearer token or database/provider/ingest secrets. |
| `agronautas-runtime-worker` | No HTTP probe; API `/ready` observes its heartbeat and lease | Redis and worker Postgres DSN are injected by named references | A configured worker is not proof; heartbeat, terminal transition, and durable DB correlation are required. |
| `ibera-hydrology-cron` | Render execution record plus direct scheduler receipt and hydrology durable completion | `scheduler:once` is authoritative; hourly schedule, fixed owner, named secret references, and no HTTP ingest path | A schedule or process exit alone is not completion evidence. |

All `sync: false` entries in `render.yaml` are named secret-manager/dashboard references. Values must never be added to this repository, commands, screenshots, logs, or receipts. Localhost defaults are local-only and must not satisfy a production origin, auth, proxy, readiness, or scheduler gate.

### Separate boundary matrix

The matrix below is a reporting template, not a production claim. `pass` means only that the static contract is present; `blocked` means a required boundary or authorization is unavailable; `not_run` means no attempt was made.

#### Local evidence

| Boundary | Status | Required evidence / current reason |
|---|---|---|
| Command and manifest contract | `pass` | Exact local commands and named service delegates are documented and statically validated. |
| Postgres/PostGIS, Redis, and worker | `blocked` | Env-backed service endpoints/processes and a fresh worker heartbeat were unavailable. |
| API health/readiness and migrations | `not_run` | Run only after required local services are healthy. |
| No-stub browser/BFF routes | `not_run` | Keep route, viewport, console, network, and request IDs in a local-only bundle. |
| Providers, tenant/auth, lead, and authorized ingest | `blocked` | Each requires real authorization and attributable data; fixtures cannot upgrade the cell. |

#### Production evidence

| Boundary | Status | Required evidence / current reason |
|---|---|---|
| Render manifest configuration | `pass` | Auth, worker-required readiness, proxy, origin, health paths, and bounded timeout names are explicit; this is not live evidence. |
| Deployed API/web revision and readiness | `not_run` | Requires an authorized deployment revision and direct/BFF probes. |
| Worker heartbeat and durable completion | `not_run` | Requires live Render worker, Redis, Postgres, migration state, and read-only correlation. |
| Provider/auth/tenant/lead/ingest boundaries | `blocked` | Credentials, owner authorization, and real tenant/lead identities are not supplied by this task. |
| Render Cron model/configuration | `pass` | Direct `scheduler:once` is selected and the checked-in command resolves to the existing API package script; this is static evidence only. |
| Render Cron execution/completion | `not_run` | Render execution ID, deployment revision, provider authorization, worker/identity access, and read-only DB correlation are unavailable; production remains blocked. |

Do not combine these matrices. A `pass` in the local or static lane cannot clear a `blocked` or `not_run` production cell.

### Cron decision gate

The owner-selected model is **direct `scheduler:once`**. This decision makes the existing Render command authoritative; it does not claim that Render has executed it. The authenticated HTTP POST is the rejected, unselected alternative and is `not_run`, never equivalent evidence. Current production status: **blocked** pending one live execution and its redacted receipt.

| Contract field | Authoritative direct-run decision |
|---|---|
| Schedule | One Render Cron at `0 * * * *`; in-process `HYDROLOGY_SCHEDULER_ENABLED=false` and `AGRONAUTAS_SCHEDULER_ENABLED=false` prevent duplicate schedules. |
| Auth/permission | The Cron service uses the fixed `HYDROLOGY_CRON_OWNER_ID` and named runtime secret references. It invokes the runner directly; it does **not** send an HTTP request or `x-hydrology-ingest-token` header to the API. |
| Idempotency | Existing scheduler metadata keys each source window by `ownerId + scheduledSlot`; `runId=scheduled-${scheduledSlot}` and one shared `proofRunId` preserve replay correlation. Duplicate terminal rows or outcomes block the receipt. |
| Timeout | Existing runner/provider bounds apply; timeout is a failure or blocked outcome, never success from process exit. The live receipt must include the observed bounded timeout result. |
| IDs | Preserve the external Render `executionId`; retain the generated safe `proofRunId`, per-source `runId`, and any emitted `requestId`/`jobId`. Direct execution has no HTTP request and no worker queue job, so unavailable `requestId`/`jobId` must be recorded as `not_run`/not applicable rather than fabricated. |
| Completion | Direct execution must reach terminal per-source outcomes and a durable completion result. There is no HTTP `202` acknowledgement in this model; a zero exit code alone is insufficient. |
| DB correlation | After completion, run one read-only query keyed by `proofRunId` and source; require exactly one matching row and matching status/counts. Store only safe row IDs, statuses, and counts. |
| Failure/rollback | On provider, auth, timeout, duplicate, worker, migration, or DB failure, keep the receipt `blocked`/`failed`/`not_run`, disable the Cron before retrying, and revert only Render/runbook configuration without resetting the database or deleting audit evidence. |
| Evidence | `pass` is reserved for the static manifest or a completed redacted boundary; unavailable Render/deployment/provider/identity/DB execution is `blocked` or `not_run`. Never serialize tokens, credentialed URLs, DSNs, payloads, chat, or stack traces. |

| Rejected alternative | Authenticated HTTP POST to `/api/hydrology/ingest` remains documented only as a rejected, unselected path. Its `202`/`statusPath` semantics cannot substitute for direct-run evidence. |

Until the direct model is live-proven, do not treat the static command or local receipt as production execution proof.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture documentation.

## AI Context

See [.ai-manifest.md](.ai-manifest.md) for AI-readable context about this codebase.

## License

MIT
