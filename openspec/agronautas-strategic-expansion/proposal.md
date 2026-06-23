# Agronautas Strategic Expansion Proposal

## Change Name

`agronautas-strategic-expansion`

## Intent

Convertir Agronautas desde un MVP agroclimático mayormente demo/contract-first hacia una plataforma productiva de inteligencia agronómica multi-agente: capaz de integrar sensores IoT, análisis satelital/VLM, RAG vectorial real, monitoreo de silo-bolsas, trazabilidad ESG/carbono y expansión multicultivo sobre PostgreSQL/PostGIS.

El impacto buscado es que productores, asesores y operadores agroindustriales puedan tomar decisiones más precisas y auditables sobre riesgo hídrico, estrés térmico, sanidad, logística post-cosecha, conservación de granos y cumplimiento ambiental. La UI debe seguir siendo “dumb UI”: presenta estado, evidencia y acciones; la decisión durable, la validación de seguridad y la orquestación viven en backend, colas y agentes controlados.

## Problem Statement

Agronautas ya posee una base moderna: `apps/web` con Next.js 15/App Router y React 19; `apps/api` con Node/Express, cluster mode, Clean/Hexagonal Architecture, PostgreSQL/PostGIS, Redis y readiness endurecido; `apps/workflow-runtime-python` con LangGraph; contratos Zod/JSON Schema; queue consumer Redis/BullMQ-compatible; y PGVector para ingestion de documentos. Sin embargo, el producto todavía arrastra limitaciones típicas de MVP:

- **Mocks y fixtures de producción**: adaptadores satelitales/climáticos aún pueden depender de datos simulados o demo; las señales reales no gobiernan todo el flujo.
- **Cobertura geográfica y agrícola limitada**: el modelo actual está centrado en arroz en Corrientes, con validación `ST_Contains`; la propuesta de valor real demanda yerba mate, té, tabaco y futura expansión regional.
- **RAG incompleto como producto**: existe base de PGVector/document ingestion, pero falta convertirlo en un Agentic RAG operacional, con retrieval, herramientas, citas, memoria, validación y trazas de decisión.
- **IoT no productivo end-to-end**: faltan APIs/streams formales para estaciones meteorológicas, sensores de suelo, silos, telemetría de maquinaria y dispositivos de campo.
- **Closed-loop agronómico riesgoso si se implementa ingenuamente**: decisiones de riego/fertilización no pueden depender de umbrales estáticos; requieren clima, fenología, suelo, historial, confianza, explicabilidad y aprobación humana.
- **Post-cosecha y logística aún no explotadas**: silo-bolsas, camiones, ventanas de cosecha y alertas de deterioro pueden reducir pérdidas materiales, pero hoy no están modelados como capabilities centrales.
- **ESG/carbono sin cadena probatoria**: los créditos o reportes ambientales necesitan evidencias verificables, hashing, provenance y auditoría; no alcanza con resúmenes generados por IA.

La industria agrícola enfrenta datos fragmentados, conectividad rural irregular, costos altos de APIs/modelos, presión por trazabilidad ambiental, necesidad de decisiones en tiempo casi real y bajo margen de error. Por eso la expansión debe priorizar resiliencia, trazabilidad, idempotencia, validación contractual y safety loops antes que “autonomía” sin control.

## Proposed Solution

La solución propuesta es una arquitectura multi-agente backend-first donde Node/Express expone APIs productivas y coordina contratos; PostgreSQL/PostGIS mantiene la verdad operativa/geoespacial; Redis/BullMQ desacopla recomputes y streams; Python/LangGraph ejecuta workflows agentic; y pgvector/PGVector habilita true Vector RAG con citas y herramientas.

### Blueprint de sistema multi-agente

- **Agronomic Orchestrator Agent**: decide qué herramientas ejecutar según cultivo, campo, fenología, clima, sensores, satélite y riesgo actual. No inventa datos: llama APIs internas versionadas.
- **Risk & Alert Agent**: recalcula `risk_snapshots` y `alert_snapshots` con drivers, confidence, freshness, `degradationReasons`, `computedAt`, `validUntil` y `evidenceRefs`.
- **Satellite/VLM Agent**: ingiere Sentinel-2/Copernicus u otros proveedores; calcula índices NDVI/NDWI/EVI, detecta estrés/flooding/anomalías y usa VLMs solo cuando agregan valor diagnóstico sobre imágenes.
- **Telemetry Agent**: procesa streams IoT, normaliza eventos, detecta drift/anomalías, dispara recomputes y propone acciones con límites de seguridad.
- **Silo-bag Monitoring Agent**: fusiona temperatura, humedad, CO₂, integridad de bolsa, clima externo y logística para detectar riesgo de deterioro o rotura.
- **ESG/Carbon Evidence Agent**: calcula indicadores de prácticas, emisiones evitadas, uso de agua, fertilización y secuestro estimado; genera evidence ledger auditable con hashes/provenance.
- **RAG Copilot Agent**: usa pgvector para recuperar manuales, protocolos, informes técnicos, normativa y evidencia del campo; responde con citas, límites de confianza y herramientas ejecutadas.

### IoT data streams y telemetry loops

Se introducen pipelines MQTT/HTTP para sensores de suelo, estaciones meteorológicas, caudalímetros, maquinaria, silo-bolsas y dispositivos edge. Cada evento se valida con Zod/JSON Schema, se persiste con `tenant_id`, `field_id`, timestamp, device provenance y calidad de señal; luego se publica a colas BullMQ/Redis para agregación, scoring y alertas. Los loops cerrados serán inicialmente **human-in-the-loop**: el sistema recomienda riego/fertilización/ventilación/logística, pero no activa equipos físicos sin aprobación, thresholds de confianza y trazas auditables.

### PostGIS multi-crop expansion

El modelo geoespacial debe pasar de “Corrientes rice zone” a cobertura multicultivo: arroz, yerba mate, té, tabaco y futuras regiones. PostGIS seguirá como fuente de verdad para boundaries, centroides, polígonos, zonas agroecológicas, nearest-weather-grid y validación territorial usando GIST indexes, `ST_Contains`, `ST_DWithin`, `ST_Intersects` y versiones oficiales de boundaries.

### Production APIs

El backend debe exponer APIs versionadas para:

- Field/crop intake multicultivo.
- Ingesta IoT y estado de devices.
- Recompute asíncrono y consulta de job runs.
- Risk, alerts, weather/satellite timeline y monitoring status.
- Copilot grounded chat con RAG/citations.
- Silo-bag assets, telemetry y spoilage risk.
- ESG/carbon evidence, reportes y audit ledger.

## Scope & Boundaries

### In Scope

- Extender contratos `packages/zod-schemas` y JSON Schema bridge para multicultivo, sensores, satélite, silo-bolsas, ESG y RAG.
- Diseñar y preparar APIs productivas en `apps/api` con auth/tenant boundaries, versioning y errores estructurados.
- Incorporar pipelines Redis/BullMQ para recompute, telemetry events, satellite ingestion, vector ingestion, silo alerts y ESG calculations.
- Expandir PostgreSQL/PostGIS con tablas/indexes para device telemetry, satellite observations, crop zones, silo assets, ESG evidence y vector metadata.
- Usar Python/LangGraph como runtime principal de agentes, con PGVector/pgvector para retrieval real y checkpointers durables.
- Introducir safety validation loops: confidence thresholds, provenance, human approval, audit trail y degraded-mode behavior.
- Secuenciar implementación por milestones verificables para evitar una mega-PR imposible de revisar.

### Out of Scope

- Activación autónoma directa de riego/fertilización/maquinaria sin aprobación humana y sin hardware certification.
- Fabricación o provisión física de sensores IoT.
- Certificación legal definitiva de créditos de carbono; la propuesta cubre evidencia y reportes preparatorios, no auditoría oficial final.
- App mobile nativa completa; puede existir soporte API/offline futuro, pero no es parte inicial.
- Reescritura del monorepo o sustitución de la arquitectura existente.
- Cobertura inmediata de todos los cultivos/países; se propone expansión incremental y versionada.

## Capabilities

### New Capabilities

- `sensor-stream-ingestion`: ingesta, validación y normalización de streams IoT.
- `telemetry-agent-orchestration`: agentes de monitoreo y recompute con safety loops.
- `satellite-vlm-analysis`: análisis satelital con índices espectrales y VLM bajo control de costo/confianza.
- `vector-rag-copilot`: copiloto con pgvector/PGVector, citations, tools y trazas.
- `multicrop-postgis-coverage`: boundaries y reglas geoespaciales multicultivo.
- `silo-bag-monitoring`: assets, telemetría, riesgo de deterioro y alertas post-cosecha.
- `esg-carbon-tracking`: evidencia, cálculo preliminar, provenance y reportes ESG/carbono.
- `async-workflow-queueing`: colas BullMQ/Redis para workflows pesados, retries y dead-letter.
- `production-agronautas-apis`: endpoints versionados para integraciones reales.

### Modified Capabilities

- `production-readiness`: ampliar readiness a workers, Redis queues, PostGIS, vector store y providers críticos.
- `agronautas-risk-monitoring`: pasar de riesgo hídrico/demo a riesgo multicapa con IoT/satélite/clima.
- `agronautas-copilot-context`: enriquecer contexto con retrieval vectorial, telemetry evidence y safety metadata.

## Technical Approach

### Backend: Node/Express cluster, Redis y BullMQ

`apps/api` seguirá siendo el API edge y application layer. Debe mantener Clean/Hexagonal Architecture: controladores HTTP delgados, use cases explícitos, ports para providers externos y adapters para PostgreSQL/Redis/Python runtime. El cluster mode exige que el pool PostgreSQL sea conservador por worker y que producción use PgBouncer o un pooler administrado para evitar exhaustion.

Redis/BullMQ será el backbone async:

- Queues propuestas: `sensor-events`, `satellite-ingestion`, `risk-recompute`, `workflow-jobs`, `silo-monitoring`, `esg-calculation`, `vector-ingestion`.
- Cada job debe tener `jobId`, `runId`, `correlationId`, `tenantId`, `fieldId`, `contractVersion`, lease, attempts, timestamps y status persistido.
- Reintentos con backoff, idempotency keys, Redis locks, DLQ y recovery desde processing queue.
- API síncrona solo encola o consulta estado; recomputes pesados corren fuera del request lifecycle.

### GIS: PostgreSQL/PostGIS spatial queries

PostGIS debe convertirse en el núcleo de territorio y cultivo:

- Boundaries versionados por cultivo, provincia, zona agroecológica y fuente oficial.
- `fields` con centroid/boundary GIST; soporte a polígonos reales y fallback centroide-first.
- Queries `ST_Contains` para cobertura, `ST_DWithin` para estaciones cercanas, `ST_Intersects` para imágenes/tiles y joins con zonas de riesgo.
- Índices GIST/BTREE compuestos para `tenant_id`, `crop`, `field_id`, `observed_at`, `provider`.
- Particionado o hypertables futuras para telemetría de alta frecuencia si el volumen lo exige.

### Python: LangGraph, PGVector y true Vector RAG

`apps/workflow-runtime-python` mantiene LangGraph como runtime oficial. La implementación existente de `worker.ingestion.vector_store` con `langchain_postgres.PGVector`, `OpenAIEmbeddings` y loaders PDF/text/URL debe evolucionar hacia un servicio RAG real:

- Ingesta asíncrona de documentos agronómicos, protocolos, normativa, reportes técnicos, manuales de cultivo y evidencia de campo.
- Retrieval filtrado por tenant, crop, región, fecha, tipo de fuente y confidence.
- Copilot con graph nodes: classify intent → retrieve context → call domain tools → validate evidence → compose answer → safety review.
- Respuestas con citations, supporting facts, trace de tools, degraded flag y unavailable reasons.
- Checkpoint durable en Postgres/Redis cuando esté configurado; fallback memory solo para desarrollo/test.

### VLM satellite analysis

El flujo satelital debe operar como pipeline asíncrono: fetch tile/scene → cloud mask/calidad → índice espectral → comparación temporal → VLM diagnostic cuando sea necesario → persistencia de observation/evidence → recompute de riesgo. Para controlar costos, el VLM se invoca solo ante anomalías, baja confianza o necesidad de explicación visual para el usuario.

### Safety validation loops

Toda recomendación accionable debe pasar por validaciones:

- Freshness y confidence mínimos.
- Provenance y evidenceRefs obligatorios.
- Detección de datos contradictorios.
- “Human approval required” para cualquier acción física.
- Rate limits y circuit breakers por provider/model.
- Audit log de inputs, tool calls, outputs y decisiones.

## Phased Roadmap & Sequencing

### Phase 0 — Baseline audit & contract map

- Inventariar contratos actuales (`fieldIntake`, `riskSnapshot`, `copilotContext`, queues, PG schemas).
- Definir versioning `v1`/`v2`, tenants, auth boundary y compatibility matrix TS↔Python.
- Resultado: diseño de delta specs y esquema de migración sin romper MVP.

### Phase 1 — Multicrop + telemetry contracts

- Extender Zod/JSON Schema para cultivos, sensor events, satellite observations, silo telemetry y ESG evidence.
- Crear migraciones/tables base e índices.
- Resultado: contracts compilables y tests de compatibilidad.

### Phase 2 — Async queue hardening

- Formalizar BullMQ/Redis producers desde Node y consumer Python.
- Persistir job runs, status, DLQ, retries, idempotency y observabilidad.
- Resultado: recomputes pesados fuera de HTTP con recuperación verificable.

### Phase 3 — Real data adapters

- Integrar clima/satélite reales con cache Redis, quotas, provenance y degraded mode.
- Ingesta inicial de IoT por HTTP/MQTT adapter.
- Resultado: risk snapshots alimentados por señales reales, no fixtures.

### Phase 4 — Satellite/VLM intelligence

- Implementar índices satelitales, anomaly detection y VLM explainability controlada.
- Resultado: alertas visuales auditables y evidenceRefs satelitales.

### Phase 5 — True Vector RAG Copilot

- Completar vector ingestion, retrieval filters, citations y LangGraph tool orchestration.
- Resultado: copiloto grounded, trazable y seguro.

### Phase 6 — Closed-loop telemetry agents

- Agentes para soil moisture, riego, fertilización, clima extremo y recomendaciones human-in-the-loop.
- Resultado: recomendaciones accionables con safety gates.

### Phase 7 — Silo-bag + ESG/carbon

- Monitoreo post-cosecha, spoilage risk, logistics alerts y evidence ledger ESG/carbono.
- Resultado: plataforma extendida a conservación y cumplimiento.

### Phase 8 — Production scale & observability

- PgBouncer, queue dashboards, traces, SLOs, alerts, cost budgets y load tests.
- Resultado: operación multi-tenant lista para pilotos pagos.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/api` | Modified/New | APIs productivas, queue producers, auth/tenant guards, adapters externos. |
| `apps/api/prisma/schema.prisma` | Modified | Modelos para telemetry, satellite observations, silo assets, ESG evidence, multicrop boundaries. |
| `infra/bootstrap/agronautas` | Modified | Extensión PostGIS, seeds multicultivo, índices GIST y datos territoriales versionados. |
| `packages/zod-schemas/src/agronautas.ts` | Modified | Contratos multicultivo, sensor events, RAG, silo y ESG. |
| `packages/contracts/schemas` | Modified | JSON Schema canónico TS↔Python. |
| `apps/workflow-runtime-python` | Modified | LangGraph agents, queue consumers, PGVector RAG, satellite/VLM workflows. |
| `apps/web` | Modified | UI de monitoreo, evidencia, queues, copiloto, silo y ESG sin lógica de negocio pesada. |
| `docker-compose.yml` / deploy config | Modified | Redis, PostGIS, PgBouncer opcional, worker runtime y envs de providers. |
| `openspec/agronautas-strategic-expansion` | New | Artefactos SDD de la expansión estratégica. |

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---:|---:|---|
| Performance degradation por streams IoT y recomputes pesados | High | High | BullMQ/Redis, batching, partitioning, cache, backpressure, DLQ y métricas por queue. |
| Exhaustión de conexiones PostgreSQL por cluster/redeploys | High | High | PgBouncer, pool per-worker conservador, `DATABASE_POOL_MAX`, load tests y alertas de saturation. |
| Costos de APIs/modelos satelitales, VLM y LLM | Medium | High | Cache Redis, invoke-on-anomaly, budgets por tenant, fallback providers, rate limits y circuit breakers. |
| Deriva de contratos TypeScript↔Python | Medium | High | JSON Schema canónico versionado, validation en queue consumer, contract tests y CI. |
| Recomendaciones agronómicas inseguras | Medium | High | Human-in-the-loop, confidence thresholds, freshness gates, safety review node y audit logs. |
| Datos IoT corruptos, spoofing o sensores mal calibrados | High | Medium | Device registry, signing/hash, anomaly detection, calibration metadata y degraded confidence. |
| PostGIS queries lentas al crecer regiones/cultivos | Medium | Medium | GIST indexes, explain plans, tiling, materialized views y query budgets. |
| ESG/carbon overclaiming | Medium | High | Evidence ledger, provenance, disclaimers, cálculo conservador y separación entre reporte preliminar y certificación legal. |
| Complejidad excesiva del roadmap | High | Medium | Phases pequeñas, chained PRs, success criteria por capability y rollback por milestone. |

## Rollback Plan

La expansión se implementará por milestones reversibles. Cada capability nueva debe estar detrás de feature flags/config (`AGRONAUTAS_*`) y rutas versionadas. Rollback inicial: desactivar producers/queues nuevas, conservar lectura del MVP actual, revertir migraciones no destructivas solo si no hay datos productivos o aplicar migrations de compensación. Para pipelines async, pausar queues, drenar jobs, mover jobs problemáticos a DLQ y volver a adapters demo/degraded. Para RAG/VLM, desactivar provider keys y devolver respuestas con `degraded=true` y reason explícito.

## Dependencies

- PostgreSQL/PostGIS productivo con opción de PgBouncer.
- Redis productivo compatible con BullMQ semantics.
- Python runtime con LangGraph, langchain-postgres/PGVector y embeddings provider.
- Proveedores satelitales/climáticos: Copernicus/Sentinel-2, NOAA/Open-Meteo/OpenWeather u otros según costo/disponibilidad.
- Provider LLM/VLM con budgets, fallbacks y logging de uso.
- Device registry / MQTT broker o HTTP ingestion gateway para sensores.
- Polígonos oficiales/versionados para zonas multicultivo.

## Success Criteria

- [ ] Los contratos multicultivo, IoT, satellite, silo, ESG y RAG compilan y tienen tests TS↔Python.
- [ ] Recompute de riesgo corre por queue async con job status, retries, DLQ e idempotencia.
- [ ] PostGIS valida fields multicultivo con boundaries versionados e índices adecuados.
- [ ] Copilot responde con true Vector RAG, citations, supporting facts, tool trace y degraded mode.
- [ ] IoT events reales pueden disparar recomputes/alertas sin bloquear HTTP.
- [ ] Satellite/VLM pipeline produce observations con evidenceRefs y controles de costo.
- [ ] Silo-bag monitoring genera alertas de deterioro con confidence y provenance.
- [ ] ESG/carbon tracking genera reportes preliminares auditables sin prometer certificación automática.
- [ ] Readiness/observability cubren Postgres, Redis, queues, worker Python, providers críticos y vector store.
- [ ] Ninguna recomendación de acción física se ejecuta sin aprobación humana y safety gates.
