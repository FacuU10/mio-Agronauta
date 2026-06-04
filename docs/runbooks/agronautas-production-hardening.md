# Agronautas production hardening runbook

## Objetivo

Cerrar el gate operativo del MVP Agronautas con rutas endurecidas, readiness veraz, bootstrap reproducible y cobertura suficiente para release.

## Bootstrap local reproducible

1. `cp .env.example .env`
2. `pnpm install`
3. `docker-compose up --build postgres redis api worker`
4. Si se quiere validar la capacidad futura Mongo, agregar `--profile optional mongodb`

El bootstrap de PostGIS y seeds vive en `infra/bootstrap/agronautas/001-postgis-schema.sql` y `infra/bootstrap/agronautas/002-corrientes-seeds.sql`.

## Release gate actual

- `GET /health` debe responder 200 como liveness puro.
- `GET /ready` debe responder 200 sólo si PostgreSQL y Redis están sanos; el worker bloquea sólo cuando `AGRONAUTAS_RUNTIME_REQUIRED=true`.
- Mongo debe aparecer como capability opcional/degradada cuando no está disponible.
- Los flujos `GET /agronautas/fields/:fieldId/risk/current` y `GET /agronautas/fields/:fieldId/alerts/current` no deben duplicar recomputes ni persistir alertas nuevas sobre snapshots stale.

## Validación mínima antes de release

### API

`node --import tsx --test apps/api/src/presentation/routes/agronautas.test.ts apps/api/src/presentation/routes/health.test.ts apps/api/src/infrastructure/database/postgres/agronautas-alert-snapshot-repository.test.ts apps/api/src/application/usecases/compute-field-risk-usecase.test.ts apps/api/src/domain/entities/agronautas.test.ts`

### Web

`pnpm --filter web test -- src/components/agronautas/page-client.test.tsx`

### Opcional / manual fuerte

- `pnpm --filter web test:e2e`
- inspeccionar `GET /agronautas/runtime` y `GET /ready` sobre el stack Compose levantado

## Señales operativas esperadas

- `X-Agronautas-Mode` y `X-Agronautas-Route-Compatibility` presentes en runtime/API.
- Errores contractuales `UNAUTHORIZED`, `FORBIDDEN` y `WORKER_UNAVAILABLE` para auth/runtime.
- Recompute reutiliza el run en vuelo cuando el lock ya existe.
- Alertas se upsertean por `(field_id, risk_snapshot_id, alert_type)`.
