# Agronautas production hardening runbook

## Release gate

1. `pnpm --filter api test`
2. `pnpm --filter web test`
3. `docker-compose up --build postgres redis api worker`
4. `GET /ready` must return `200` when Postgres/Redis are healthy and Mongo is absent.
5. If `AGRONAUTAS_RUNTIME_REQUIRED=true`, `/ready` must also report a healthy worker heartbeat.

## Bootstrap

- PostGIS and the Corrientes bootstrap SQL live in `infra/bootstrap/agronautas/`.
- `docker-compose` mounts those scripts into `/docker-entrypoint-initdb.d` so local, CI, and release rehearsals share the same seed source.
- Mongo remains an optional profile: `docker-compose --profile optional up mongodb`.

## Operational notes

- Alert ids are deterministic: `{fieldId}:{snapshotId}:{alertType}`.
- `alert_snapshots` must preserve the uniqueness boundary `(field_id, risk_snapshot_id, alert_type)`.
- `/health` is liveness only; `/ready` is the operational gate.
- Keep `env.env` and `apps/api/tsconfig.tsbuildinfo` out of commits.
