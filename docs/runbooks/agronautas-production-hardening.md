# Agronautas production hardening runbook

## Objetivo

Cerrar el gate operativo del MVP Agronautas con rutas endurecidas, readiness veraz, bootstrap reproducible y cobertura suficiente para release.

## Bootstrap local reproducible

1. `cp .env.example .env`
2. `pnpm install`
3. Suministrar por variables de entorno o configuración de procesos los endpoints de PostgreSQL/PostGIS y Redis, además del proceso worker.
4. Iniciar la API y la web con `cd backend && pnpm run dev` y `cd frontend && pnpm run dev`.

Las migraciones aditivas y los seeds de PostGIS viven en `infra/bootstrap/agronautas/001-postgis-schema.sql` y `infra/bootstrap/agronautas/002-corrientes-seeds.sql`; deben ejecutarse contra la base suministrada por el entorno.

## Release gate actual

- `GET /health` debe responder 200 como liveness puro.
- `GET /ready` debe responder 200 sólo si PostgreSQL y Redis están sanos; el worker bloquea sólo cuando `AGRONAUTAS_RUNTIME_REQUIRED=true`.
- Mongo debe aparecer como capability opcional/degradada cuando no está disponible.
- Los flujos `GET /agronautas/fields/:fieldId/risk/current` y `GET /agronautas/fields/:fieldId/alerts/current` no deben duplicar recomputes ni persistir alertas nuevas sobre snapshots stale.

## Proveniencia del slice de estabilización

El slice de higiene mantiene sólo fuente, tests, docs, config, SQL y artifacts SDD. Los cambios conservados deben mapearse a estos requisitos:

| Área conservada | Requisito/spec | Motivo de conservación |
|---|---|---|
| `.gitignore`, `apps/api/src/build-config.test.ts` | `agronautas-stabilization-gates` / Clean Release Provenance | Bloquea que `*.tsbuildinfo`, `__pycache__`, `.pytest_cache`, `apps/web/test-results` y `playwright-report` vuelvan al diff de release. |
| `packages/zod-schemas/*`, `packages/contracts/*` | Provider truth, dashboard/PDF payload parity | Contratos y validaciones son fuente/test, no salida generada. |
| `apps/api/src/**/agronautas*`, `infra/bootstrap/agronautas/*.sql` | Provider status, scheduler cadence, persisted ingestion evidence | Código, tests y fixtures PostGIS desarrollados para sostener las garantías de ingestión. |
| `apps/web/src/components/agronautas/*`, `apps/web/src/lib/agronautas/*`, `apps/web/tests/e2e/*` | Dashboard/PDF parity, no false live claims, scoped Playwright | Layouts visuales y pruebas E2E son trabajo valioso a verificar en los siguientes slices. |
| `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py`, `apps/workflow-runtime-python/tests/*` | Worker ingestion operations | Lógica y pytest cases de worker se conservan; sólo se eliminaron caches Python generados. |

Rollback del slice: revertir `.gitignore`, `apps/api/src/build-config.test.ts`, esta sección del runbook y los `git rm` de artifacts generados; no tocar código fuente Agronautas ni Iberá-Alerta.

## Validación mínima antes de release

Esta validación mínima no reemplaza el gate final. Para lanzamiento, el verify debe incluir Playwright y revisión pesimista en contexto fresco.

### API

`node --import tsx --test apps/api/src/presentation/routes/agronautas.test.ts apps/api/src/presentation/routes/health.test.ts apps/api/src/infrastructure/database/postgres/agronautas-alert-snapshot-repository.test.ts apps/api/src/application/usecases/compute-field-risk-usecase.test.ts apps/api/src/domain/entities/agronautas.test.ts`

### Web

`pnpm --filter web test -- src/components/agronautas/page-client.test.tsx`

### Manual fuerte

- `pnpm --filter web test:e2e`
- inspeccionar `GET /agronautas/runtime` y `GET /ready` contra la API y los servicios suministrados por el entorno

## Credenciales y configuración de proveedores

- `OPEN_METEO_BASE_URL` opcional; si no existe, usar `https://api.open-meteo.com`. No requiere API key para el forecast público usado por MVP.
- `SMN_BASE_URL` opcional; configurar contra el endpoint operativo acordado antes de activar modo real. Si requiere token institucional, inyectarlo como secreto runtime, nunca en el repo.
- `NASA_FIRMS_API_KEY` requerido antes de activar FIRMS real; guardar en secret manager/CI env y rotar ante filtración.
- `SENTINEL_CLIENT_ID` / `SENTINEL_CLIENT_SECRET` requeridos antes de activar Sentinel real; usar mínimos permisos y rotación administrada.
- `RADAR_SINARAME_*` queda deshabilitado hasta confirmar endpoint, cuota y credenciales operativas.

## Cadencia, cron y SLA de frescura

- Cron base: el scheduler corre cada 1 hora y sólo encola ventanas vencidas por fuente.
- Open-Meteo forecast: ventana horaria; SLA de frescura 3h; referencia `https://open-meteo.com/en/docs`.
- SMN alertas/observaciones: ventana horaria; SLA de frescura 3h; referencia institucional SMN acordada en configuración.
- NASA FIRMS hot spots: ventana cada 3h; SLA de frescura 6h; referencia `https://firms.modaps.eosdis.nasa.gov/`.
- Sentinel NDVI/EVI: ventana diaria; SLA de frescura 72h; referencia Copernicus/Sentinel Hub operativa.
- SINARAME/radar: fuente deshabilitada hasta validar disponibilidad; no debe bloquear el resto del pipeline.

## Playbook de degradación

- Si una fuente falla, guardar evidencia cruda del fallo, marcar `degraded`/`stale` en backend y usar último snapshot bueno cuando exista.
- La UI no calcula frescura, confianza ni degradación; sólo muestra `freshness`, `confidence`, `degradationReasons` y evidencia entregados por API.
- Si el lock de recompute ya existe, responder con el snapshot persistido y estado de recompute en vuelo; no duplicar trabajos.
- Si se agota retry/DLQ, mantener latest-good, exponer razón de degradación y abrir incidente con proveedor, ventana y run id.

## Rollback

- Desactivar cron/queue de ingestión real y mantener respuestas desde snapshots persistidos/latest-good.
- Ocultar acción PDF o dashboard real si la evidencia no cumple SLA; conservar rutas de health/readiness.
- Revertir credenciales de proveedores desde secret manager y rotar cualquier token involucrado.
- Las migraciones agregadas son aditivas; no dropear tablas durante rollback del MVP.

## Gate final obligatorio

- Ejecutar `pnpm test`, `pnpm --filter api test`, `pnpm --filter web test`, `pnpm exec playwright test` y `pytest apps/workflow-runtime-python`.
- Tests/build solos son insuficientes: verify debe adjuntar evidencia Playwright.
- Después de Playwright, correr revisión pesimista/adversarial en contexto fresco contra diff/código, claims de lanzamiento, cadencia scheduler, evidencia Playwright y rollback.
- No lanzar si quedan blockers de frescura, credenciales, evidencia, Playwright o rollback.

## Señales operativas esperadas

- `X-Agronautas-Mode` y `X-Agronautas-Route-Compatibility` presentes en runtime/API.
- Errores contractuales `UNAUTHORIZED`, `FORBIDDEN` y `WORKER_UNAVAILABLE` para auth/runtime.
- Recompute reutiliza el run en vuelo cuando el lock ya existe.
- Alertas se upsertean por `(field_id, risk_snapshot_id, alert_type)`.

## Environment Manifest Verification Steps

The production and staging environments must adhere to this non-secret manifest before any service deployment or liveness gate can pass.

### Environment Variable Manifest

| Variable Name | Owner | Purpose | Surface | Fail-Fast / Validation Behavior |
|---|---|---|---|---|
| `DATABASE_URL` | DB Admin | Main Postgres database connection URL | API, Web BFF | **Blocking Blocker**: Application refuses to start if missing or invalid in production. |
| `REDIS_URL` | Infra Team | Distributed locks and job scheduling metadata | API | **Blocking Blocker**: Application refuses to start if missing or unreachable in production. |
| `AGRONAUTAS_RUNTIME_REQUIRED` | Product | Enforces full runtime availability including worker and optional integrations | API | Optional/False by default. If True, `/ready` is unhealthy if workers/optional backends fail. |
| `NASA_FIRMS_API_KEY` | SecOps | Access NASA active fire hotspots data | API | **Blocking in production**: If `AGRONAUTAS_RUNTIME_REQUIRED=true` and key is missing or placeholder. |
| `SENTINEL_CLIENT_ID` | SecOps | Authentication client ID for Copernicus/Sentinel hub imagery | API | **Blocking in production**: If `AGRONAUTAS_RUNTIME_REQUIRED=true` and ID is missing or placeholder. |
| `SENTINEL_CLIENT_SECRET` | SecOps | Authentication client secret for Copernicus/Sentinel hub imagery | API | **Blocking in production**: If `AGRONAUTAS_RUNTIME_REQUIRED=true` and secret is missing or placeholder. |
| `HYDROLOGY_INGEST_TOKEN` | SecOps | Operator authentication token for submitting government hydrology records | API | **Blocking in production**: If missing or placeholder. |
| `AGRONAUTAS_SCHEDULER_ENABLED` | App Admin | Enables background job scheduler daemon | API | Optional/Boolean flag. |
| `HYDROLOGY_SCHEDULER_ENABLED` | App Admin | Enables background hydrology ingestion scheduler daemon | API | Optional/Boolean flag. |

### Verification Steps

1. **Static Manifest Check**: Before starting the server in staging or production, run the `ProductionEnvValidatorPort` validator to verify all required variables are set.
2. **Readiness Probe Check**: Verify `/ready` returns `200 OK`. If any required or critical non-optional service is down, `/ready` must fail fast with a `503 Service Unavailable` status.
3. **No-Secret Leak Verification**: Ensure that any startup or validation failure logs do NOT print the actual value of any environment variable, outputting only the missing or invalid variable name.

