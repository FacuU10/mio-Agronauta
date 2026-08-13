# Exploration: Agronautas and Iberá-Alerta product completion

## Current State

### Evidence baseline

- Repository: `monorepo-js-baseline`.
- Branch: `main`.
- HEAD: `ccb8a63` (`fix: stabilize unified production continuation`).
- Working tree: clean at exploration time.
- Artifact mode: hybrid OpenSpec plus Engram.
- No application code, schema, migration, configuration, or test file was modified by this exploration.
- The repository has a usable CodeGraph index with 246 indexed files and is up to date. Targeted CodeGraph exploration was used before filesystem inspection.
- The root OpenSpec configuration identifies a Next.js 15/React 19/Tailwind 4 web app, Express/Prisma/PostgreSQL/PostGIS/Redis API, Python worker, shared Zod/JSON contracts, Node test suites, pytest, and Playwright.

The existing unified work is materially further along than a blank product, but it is not a complete agricultural operating system or a complete institutional flood-management platform. The safest planning boundary is to finish the smallest end-to-end pilot workflows around the contracts and persistence that already exist, then add product domains only when their data ownership and business rules are explicit.

### Agronautas current implementation

The canonical Agronautas API is `apps/api/src/presentation/routes/agronautas.ts`. It currently provides:

- Runtime/mode discovery.
- Demo contact submission.
- Field creation through `POST /fields` with crop, hectares, locality, point, and optional polygon input.
- Field read through `GET /fields/:fieldId`, including polygon text when available.
- Geometry read/update through `GET /fields/:fieldId/geometry` and authenticated `PATCH /fields/:fieldId/geometry`.
- Current risk, risk timeline, current alerts, alert timeline, monitoring status, composed dashboard, weather timeline, hydrology dashboard/alerts, PDF dashboard, recompute request, grounded chat, and hydrology Copilot SSE.

The browser service in `apps/web/src/lib/agronautas/service.ts` has typed adapters for these routes. The main product entry remains `/demo`; the field detail route is `/demo/fields/[fieldId]`. `page-client.tsx`, `workspace.tsx`, and `field-detail.tsx` already render risk, confidence, freshness, drivers, alerts, timelines, provenance, recompute state, evidence states, chat, Copilot, report action, and a provider-neutral geometry editor.

The active persistence path is also more complete than earlier artifacts indicate:

- `apps/api/prisma/migrations/20260812130000_agronautas_field_geometry/migration.sql` adds PostGIS boundary/centroid and server-derived area/perimeter columns.
- `PostgresFieldRepository.save()` writes polygon geometry and server metrics.
- `findById()` and `findByExternalFieldId()` read polygon WKT back with `ST_AsText`.
- `getGeometry()` and `updateGeometry()` validate, normalize, persist, and return geometry metrics with optimistic timestamp protection.
- `CreateFieldIntakeUseCase` derives the polygon centroid/hectares when a polygon is supplied.

This establishes a real geometry implementation path, but not a fully proven commercial pilot. The code still has important boundaries:

- Coverage is resolved against the configured `corrientes_rice` boundary and a point/derived centroid; this is not general regional coverage.
- The current UI remains provider-neutral and shows a non-cartographic vertex editor. Google Maps/Places/Drawing/Geometry are not configured or dependency-backed in the repository.
- Current field persistence is field-centric. There is no field list/workspace API, campaign entity, task entity, responsibility assignment, decision log, or operational activity feed.
- Risk snapshots, alert snapshots, ingestion runs, job runs, and weather timelines provide history for the existing monitoring domain, but they are not a general business history or decision audit system.
- The TypeScript risk contract and Python runtime intentionally keep canonical engine selection undecided. The repository records divergence between `risk-v0` and `open-meteo-basic-v1`; no product claim should imply a settled multi-engine risk standard.
- Some dashboard/demo paths intentionally contain mock, seam, fallback, or unavailable states. Tests prove contract/UI behavior, not live Google, Render, or every provider scenario.

### Iberá-Alerta current implementation

The canonical institutional API is `apps/api/src/presentation/routes/hydrology-government.ts`, with separate `/municipalities`, `/municipalities/:id/dashboard`, `/ingest`, `/ingest/:runId`, `/ingest/verify`, and municipality Copilot routes. The web product has separate `/municipalities`, `/municipalities/[id]`, and `/municipalities/ingest` pages and separate government components.

The current institutional surface provides:

- Province overview with source freshness for PNA, INA, INMET, and SMN.
- Municipality cards, search/source/status filters, mapped gauge identifiers, latest telemetry, official alert projections, and accessible list fallback instead of a data-backed map.
- Municipality detail with telemetry cards, source links, station mappings, official alerts, INA predictions up to 30 days, provenance, coverage gaps, evidence states, and Copilot Advisor.
- Protected operator ingest verification, asynchronous admission, bounded status polling, per-source result rendering, sanitized diagnostics, run/proof IDs, retry states, and source-specific status.
- Official-source adapters and persistence in `packages/hydrology-engine`, including deduplicated telemetry and a PostgreSQL Iberá ingest ledger.
- Copilot safety boundaries that restrict context to PNA/INA/INMET/SMN, distinguish observed/forecast/degraded data, mark longer forecasts as speculative, and explicitly reject hydraulic routing, lag, dam discharge, and evacuation-authority claims.

The durable ingest ledger is present in the current code and migration:

- `ibera_ingest_runs` stores queued/running/terminal state, requested sources, source results, diagnostics, lease metadata, expiry, and proof correlation.
- `HydrologyRepository` implements create, update, lease claim, read, and bounded prune operations.
- The coordinator prefers durable reads when the repository exposes the ledger methods.
- The Render manifest declares one `ibera-hydrology-cron` and disables in-process schedulers in the API service.

However, product completeness remains limited:

- The municipality API does not return boundary geometry or a geometry provenance/version field.
- Seeded municipality boundaries are generated squares around monitored ports, not verified official administrative boundaries. PostGIS storage and GIST indexes prove storage capability, not territorial correctness.
- Municipality mappings express source/gauge association and threshold comparison. They do not model hydraulic influence, propagation, travel time, causality, or impact at each point in a territory.
- The API exposes latest telemetry and official alert projections, but there is no user-facing incident/event history model with acknowledgement, assignment, escalation, resolution, or institutional case tracking.
- The institutional workflow is an operations/monitoring workflow, not a complete municipality/agency collaboration workflow.
- Coverage is seeded around a finite set of ports and Copilot zones are explicitly constrained. This is not municipality-wide or province-wide product coverage.
- Render configuration exists, but production service ownership, current Cron execution, restarts, provider outcomes, and production database/browser evidence remain external follow-ups.

### Existing tests and artifacts

The repository has substantial focused coverage:

- Agronautas route, entity, geometry, repository, risk, alert, job, provider, contract, web component, and Playwright smoke tests.
- Iberá hydrology-engine, adapter, route, repository, scheduler, ingest, government component, and Playwright tests.
- Python worker contract, queue, job, Copilot, and runtime-boundary tests.
- Root `pnpm test` and `pnpm build` are configured as the principal repository checks.

Existing OpenSpec artifacts document the completed unified baseline, UI/UX visibility work, Agronautas field mapping, and Iberá hardening. They are useful evidence of implemented boundaries, but their historical branch/commit context must not be reused as current production proof. The current artifact should therefore treat code and current contracts as authoritative, and treat Google credentials, Render proof, and a real pilot as deferred evidence dependencies.

## Affected Areas

### Shared product boundary

- `apps/web/src/app/demo/page.tsx`, `apps/web/src/app/demo/fields/[fieldId]/page.tsx` — current Agronautas entry and detail routes.
- `apps/web/src/app/municipalities/page.tsx`, `apps/web/src/app/municipalities/[id]/page.tsx`, `apps/web/src/app/municipalities/ingest/page.tsx` — separate Iberá-Alerta routes.
- `apps/web/src/components/shell/product-shell.tsx` and `apps/web/src/components/visibility/*` — shared presentation primitives; reuse must not merge product domain contracts or claims.
- `packages/zod-schemas/src/agronautas.ts` — shared contract file containing both Agronautas and hydrology schemas; additions require explicit namespaces and product ownership.
- `openspec/config.yaml`, `render.yaml`, `.env.example`/environment validation — testing and deployment boundaries; configuration-only work is distinct from product capability.

### Agronautas

- `apps/api/src/presentation/routes/agronautas.ts` — additive endpoints for any field index, activity, campaign, or report slice; current route set has no campaign/task/business workflow routes.
- `apps/api/src/domain/entities/agronautas.ts`, `apps/api/src/domain/repositories/agronautas.ts` — existing field/risk/signal/job ports; new business entities should not be hidden in `Field` JSON or dashboard presentation payloads.
- `apps/api/src/application/usecases/create-field-intake-usecase.ts`, `update-field-geometry-usecase.ts` — current field lifecycle and geometry truth.
- `apps/api/src/infrastructure/database/postgres/agronautas-field-repository.ts` — current PostGIS field persistence and the likely boundary for a field index/read-back slice.
- `apps/api/prisma/schema.prisma` and `apps/api/prisma/migrations/20260812130000_agronautas_field_geometry/migration.sql` — current field/risk/alert/job/geometry persistence; no campaign, task, responsibility, decision, market, or insurance models.
- `packages/zod-schemas/src/agronautas.ts` — current intake, geometry, risk, alert, dashboard, chat, and evidence schemas; no product contracts for campaigns, tasks, prices, market actors, credit, insurance, or planting plans.
- `apps/web/src/components/agronautas/page-client.tsx`, `workspace.tsx`, `field-detail.tsx`, `field-geometry-editor.tsx` — existing pilot UI; candidate for incremental field index/history/report completion rather than a second shell.
- `apps/web/src/lib/agronautas/service.ts`, `schemas.ts`, `intake-map.ts` — browser transport and provider-neutral map/geometry seam.
- `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` and tests — current recompute execution boundary and engine divergence evidence.

### Iberá-Alerta

- `apps/api/src/presentation/routes/hydrology-government.ts` — municipal reads, ingest admission/status, source orchestration, Copilot scope, threshold context, and safe out-of-scope boundary.
- `packages/hydrology-engine/src/repository.ts`, `types.ts`, adapters, and clients — durable telemetry, ingest ledger, source normalization, mapping, freshness, and official provenance.
- `apps/api/prisma/schema.prisma` and migrations for municipalities, telemetry, ingest ledger, and alert coverage — current PostGIS/data model and missing geometry semantics.
- `apps/web/src/components/government/overview.tsx`, `detail.tsx`, `ingest-panel.tsx` — current institutional read, detail, and operator journeys.
- `apps/web/tests/e2e/hydrology-government.spec.js`, `hydrology-ingest.spec.js`, and `municipalities-alerts.spec.ts` — browser contracts, mostly stubbed; real-provider and production evidence remain separate.
- `render.yaml` and `apps/api/src/server.ts` — external Cron ownership and disabled in-process scheduler configuration.

## Roadmap classification

Classification meanings used below:

- **Implemented** — a current route, contract, persistence path, and UI/test surface exist for the stated narrow capability.
- **Partial** — a meaningful subset exists, but the user-facing workflow, coverage, durability, or semantics are incomplete.
- **Missing** — no current product contract/model/route supports the capability.
- **Deferred** — intentionally left for a later phase because an external dependency, product decision, or prior boundary blocks it.
- **Unsafe to claim** — code or storage may exist, but available evidence or semantics do not support the requested product claim.
- **Configuration-only** — the repository has a manifest/env seam, but capability requires external setup or runtime proof.

### Agronautas roadmap

| Roadmap area | Classification | Current evidence | Smallest credible code boundary |
|---|---|---|---|
| Actual pilot workflow completion | **Partial** | Intake, field detail, risk/alerts, evidence, recompute, chat, Copilot, report, and geometry paths exist; no multi-field operational loop or measured pilot outcome exists. | Close one supported Corrientes rice pilot journey: field create/read, geometry read-back, current risk/alerts, timeline, recompute observation, grounded explanation, and report with explicit evidence states. |
| Field/workspace | **Partial** | `/demo` is a single-field workspace with Zustand selection; no field index/list route or durable workspace membership model exists. | Add a read-only field index/list contract over existing `fields`, with selected-field navigation and empty/error states. Do not introduce multi-tenant claims. |
| Lots | **Partial** | `Field` is the existing lot-like aggregate and field detail is operational. | Reuse `Field` as the pilot lot boundary; expose list/read filters before creating a second `Lot` model. |
| Campaigns | **Missing** | No `campaign` model, route, schema, or UI. | Defer until crop-season identity, date/season rules, field association, and ownership are defined. A campaign cannot be represented safely as a dashboard card. |
| Tasks | **Missing** | No task model, assignment route, state machine, reminder, or UI. | Defer; first define task ownership, status transitions, due-date semantics, and notification boundary. |
| Responsibles | **Missing** | Static bearer scopes exist, but no farm/team user or responsibility entity exists. | Defer user/team modeling; do not infer responsibles from auth token labels. |
| Decisions | **Missing** | Chat traces and risk evidence are not a human decision register. | Add only after a decision record contract defines actor, timestamp, field/campaign context, selected option, rationale, and evidence references. |
| History | **Partial** | Risk/alert/weather/signal/job histories are persisted and queried. | Complete a unified field activity/timeline read model from existing persisted records; do not call it business decision history until human actions are modeled. |
| Reports | **Partial** | `GET /dashboard.pdf` and PDF request schema exist; report is derived from dashboard state. | Make the existing report explicitly snapshot/evidence aware and expose report generation status/limitations without creating a general document system. |
| Productivity intelligence | **Missing** | No yield, labor, machine, cost, output, or productivity model. | Defer until a measured input/output contract and unit policy exist. |
| Economic intelligence | **Missing** | No farm economics or profit/loss model. | Defer; do not calculate economics from hectares and risk alone. |
| Soil | **Deferred / unsafe to claim** | Soil signal types and seams appear in contracts/demo states, but no verified source-backed soil product path is present. | Keep visible as missing/seam evidence; implement only one source-backed soil slice after source, cadence, units, and persistence are approved. |
| Crops | **Partial** | Shared schemas enumerate crops and domain entities accept them, but coverage and current pilot are Corrientes rice-focused. | Keep the pilot explicitly rice/Corrientes; add another crop only with coverage, provider, risk, and UI evidence—not by expanding an enum alone. |
| Climate | **Partial** | Open-Meteo/weather timelines, hydrology context, freshness, and provider evidence exist. | Finish one field climate evidence bundle using existing weather timeline/provider contracts; avoid claiming a complete climate intelligence layer. |
| Prices | **Missing** | No price route, schema, provider adapter, storage, or UI. | Defer until commodity, market, currency, timestamp, source, and revision semantics are defined. |
| Dollar | **Missing** | No FX contract or source. | Defer; never use an unstated exchange rate in economic or market views. |
| Trends | **Partial for climate/risk; missing for market/economics** | Risk and weather timelines exist; no generalized trend model. | Add explanatory trend projections only to existing risk/climate timelines; do not create cross-domain trend claims. |
| Explained planting recommendations | **Missing** | Existing risk recommendations are operational text, not planting recommendations tied to evidence and alternatives. | Defer until a crop/soil/climate/price input contract and explanation format exist. |
| Campaign planning | **Missing** | No campaign, calendar, resource, cost, or scenario entities. | Defer as a separate domain after field index and pilot evidence are stable. |
| Calendars | **Missing** | Scheduler cadences are data acquisition schedules, not farm calendars. | Do not expose source cadence as a crop calendar; define crop-stage events first. |
| Resources | **Missing** | No inventory, machinery, labor, input, or allocation model. | Defer; requires operational ownership and unit/availability rules. |
| Costs | **Missing** | No cost model or currency basis. | Defer until prices, units, dates, and farm accounting scope are explicit. |
| Scenarios | **Missing** | No scenario persistence or comparison contract. | Defer; avoid front-end-only simulators that cannot persist assumptions and evidence. |
| Simulators | **Deferred** | Existing copy/placeholder boundaries explicitly avoid unsupported simulation. | Keep placeholder-only; implement a deterministic scenario engine only after inputs, equations, and validation cases exist. |
| Market intelligence | **Missing** | No market data domain or source-backed route. | Defer until a single commodity/market/source vertical slice is selected. |
| Commodities | **Missing** | Crop enums are not commodity market data. | Defer; do not equate crop metadata with tradable commodity identity. |
| Export | **Missing** | No export flow, compliance, logistics, buyer, or shipment contract. | Defer as a later commercial integration. |
| Marketplace | **Missing** | No marketplace entities, offers, matching, or authorization model. | Defer; no speculative marketplace module should be added to the current pilot. |
| Buyers/providers | **Missing** | No organization, provider, buyer, offer, or relationship model. | Defer until marketplace/commercial ownership is approved. |
| Farm risk scores | **Partial** | Field risk snapshots, alerts, freshness, drivers, and evidence are implemented. | Finish evidence-grounded explanation and field index prioritization; do not broaden into a canonical enterprise risk score. |
| Credit | **Missing** | No lender, application, underwriting, or financial evidence contract. | Defer; current risk snapshots are not credit decisions. |
| Insurance evidence | **Missing** | No policy, coverage, event, evidence package, or insurer contract. | Defer; weather/risk evidence can be a future input but is not an insurance product. |
| Pricing | **Missing** | No insurance or credit pricing source/rules. | Defer; do not derive pricing from risk score. |
| Claims | **Missing** | No claims intake, loss evidence, adjudication, or status workflow. | Defer; requires insurer-specific legal and operational rules. |
| Google Maps/Places/Drawing | **Configuration-only / deferred** | Provider-neutral map seam and geometry editor exist; no credential-backed SDK/runtime. | Keep optional adapter and accessible fallback. Implement credential-backed UI only after external setup; it is not a prerequisite for API geometry truth. |

### Iberá-Alerta roadmap

| Roadmap area | Classification | Current evidence | Smallest credible code boundary |
|---|---|---|---|
| Institutional pilot operations | **Partial** | Overview, municipality detail, protected ingest, durable ledger path, source diagnostics, and Copilot exist. | Finish one operator-to-municipality loop: inspect overview, open municipality, interpret threshold/forecast/source state, run protected ingest, observe durable terminal result, and retain a linkable run/proof record. |
| Municipality expansion | **Partial** | Seed/mapping logic covers a finite monitored set; not general province coverage. | Reconcile the authoritative municipality list and coverage metadata before adding rows. Expansion must be data-backed, not a UI loop over invented cards. |
| Zone expansion | **Partial** | Copilot and hydrology field context intentionally allow only Mercedes, Ituzaingó, and Virasoro. | Add a zone only when official stations, source mappings, prompt/context semantics, and test fixtures are available. |
| Incident history | **Partial / missing as a product workflow** | Hydrology telemetry, storm-alert records, and ingestion history are persisted, but only current projections are surfaced. | Add a read-only municipal incident/alert timeline from existing telemetry and official alert records, clearly distinct from human incident management. |
| Institution workflows | **Partial** | Token verification and operator ingest are implemented. | Add only an explicit operator workflow around ingest history/status and source diagnostics; defer user accounts, roles, acknowledgement, escalation, and case management. |
| Verified PostGIS geometry | **Unsafe to claim** | PostGIS municipality boundaries and GIST indexes exist; seeded geometry is generated square geometry and the API omits it. | First add geometry provenance/version/validity metadata and a read-only inspection contract. Expose geometry only after an approved authoritative source is loaded and verified. |
| Territorial impact | **Partial, threshold/mapping only** | Gauge mappings, municipality thresholds, latest telemetry, alerts, and coverage gaps are available. | Add an explicit “mapped observation / threshold comparison” explanation per municipality; do not label it hydraulic or spatial impact modeling. |
| Threshold explanation per municipality | **Partial** | API stores alert/evacuation heights and overview derives low/moderate/high threshold status. | Return the threshold values, comparison value, source/time, and explanation in one validated municipal view model; remove any hard-coded presentation thresholds where applicable. |
| Trend explanation per municipality | **Partial** | Telemetry carries tendency and UI renders observed/degraded/forecast modes. | Add a small municipality trend explanation derived from available telemetry only, including window/source/freshness; no inferred trend where records are absent. |
| Forecast explanation per municipality | **Partial** | INA forecasts up to 30 days, source links, confidence, and 15–30 day speculative copy exist. | Make forecast horizon, confidence, observed timestamp, source, and planning-only boundary explicit in the detail contract/UI. |
| No-hydraulic-simulation boundary | **Implemented** | Copilot prompt and route explicitly reject routing, lag, discharge, hydraulic simulation, and evacuation authority; UI says mappings are not hydraulic impact. | Preserve this boundary in every future territorial/forecast slice and add no hydraulic-looking map or propagation claim without a separate approved model. |
| Production service/Cron proof | **Configuration-only / unsafe to claim** | `render.yaml` declares API, web, and one Cron; API schedulers are disabled for Render. | Keep configuration as the deployment boundary. Collect Render execution/restart/provider evidence later; do not treat manifest presence as proof. |

## Smallest coherent implementation slices

The following slices are intentionally narrower than the full roadmap. They are ordered by dependency and can be implemented without inventing external data.

### Slice A — Agronautas pilot field index and evidence-first workflow

**Goal:** turn the existing single-field demo into a credible small pilot loop without introducing campaigns, users, or speculative intelligence.

**Code scope:**

- Add a read-only field index contract and repository query over existing `fields`.
- Add typed browser service/query state for list, empty, loading, error, and unauthorized cases.
- Keep `/demo` and `/demo/fields/[fieldId]` as the existing Agronautas route family.
- Preserve current field creation, geometry, risk, alert, timeline, recompute, chat, Copilot, and report contracts.
- Add a single evidence-oriented activity projection from existing risk/alert/weather/job records only if the source timestamps and identifiers can be retained.

**Not included:** campaigns, tasks, responsibles, decisions, market data, credit, insurance, Google SDK, or a new tenant model.

**Dependencies:** none beyond current field persistence and contracts. The field index is the first dependency for any later multi-lot prioritization.

### Slice B — Agronautas geometry/read-back and pilot report closure

**Goal:** prove and expose the existing geometry implementation honestly, then align the report with the saved field snapshot.

**Code scope:**

- Add focused API/repository contract coverage for save → read field → read geometry and stale geometry update behavior.
- Ensure field detail renders the returned geometry status/source/updated timestamp and server-derived hectares without implying Google availability.
- Make PDF/report output identify its snapshot/time/evidence state and distinguish point-only from saved geometry.
- Keep coverage tied to the existing Corrientes rice boundary and preserve the accessible non-map editor.

**Dependencies:** Slice A is useful for navigation but not technically required. External Google setup is not required for the API/read-back slice.

### Slice C — Agronautas explanatory risk/climate decision layer

**Goal:** improve the actionable pilot decision without creating a new risk engine.

**Code scope:**

- Reuse current `RiskSnapshot`, `DashboardSnapshot`, weather timeline, alert lineage, drivers, freshness, and evidence references.
- Add a typed view model that explains score/level, drivers, valid window, source/run IDs, and next review action.
- Add source-specific observed/forecast/degraded/missing explanations to the existing field detail.
- Keep engine selection undecided and explicitly report engine/rule metadata where available.

**Dependencies:** Slice A/B provide the field navigation and geometry identity. No new external provider is required.

### Slice D — Iberá durable operator run history

**Goal:** make the institutional ingest workflow durable and auditable at the product level using the existing ledger, without adding a new worker or queue.

**Code scope:**

- Add a read-only recent ingest-run query/contract backed by `ibera_ingest_runs`, including status, requested sources, per-source result, proof ID, timestamps, and safe diagnostics.
- Add an operator history view linked from `/municipalities/ingest`.
- Keep token handling ephemeral and preserve the existing protected verification flow.
- Reconcile startup/runtime dependency injection so the durable repository path is the explicit production path, while keeping test seams.

**Dependencies:** current Iberá ledger migration and repository methods. Render Cron proof is not needed to build the local contract, but is needed to claim production operation.

### Slice E — Iberá municipality explanation and incident timeline

**Goal:** give an operator a verifiable explanation of current municipality state without claiming hydraulic modeling.

**Code scope:**

- Add a read-only incident/alert timeline projection from persisted telemetry and official alerts.
- Return threshold values, observed value, comparison result, tendency, forecast horizon/confidence, freshness, source URL, and last-successful timestamp in an explicit explanation contract.
- Render an accessible table/timeline on municipality detail.
- Label all territorial relations as source mapping/threshold comparison and retain the no-hydraulic-simulation boundary.

**Dependencies:** Slice D is independent but improves operational traceability. Authoritative geometry is not required for the list/timeline slice.

### Slice F — Iberá authoritative geometry gate

**Goal:** only after an approved official geometry source is available, expose map-ready geometry with provenance.

**Code scope when data is available:**

- Add source/version/administrative-level/validity metadata to municipality geometry.
- Validate SRID, validity, and expected relation to the official dataset.
- Extend the municipal contract with geometry only after those checks pass.
- Keep a list/table fallback and never convert geometry plus gauge mappings into hydraulic impact.

**Dependencies:** external authoritative geometry/data approval. This is not a safe first implementation slice on the current seeded square boundaries.

### Explicitly later domains

Campaigns, calendars, tasks, responsibles, human decisions, productivity, economics, prices, dollar, market intelligence, commodities, export, marketplace, buyers/providers, planting recommendations, scenarios, simulators, credit, insurance, pricing, and claims require separate proposals after the field/municipality pilot loops establish real data ownership. They should not be bundled into the next code slice.

## Approaches

1. **Broad product-suite build** — Add campaigns, task management, market, finance, insurance, municipality expansion, and map capabilities in one cross-product change.
   - Pros: appears to address the full vision quickly.
   - Cons: current contracts and data models do not support it; would invent roles, data, pricing, recommendations, and territorial semantics; high coupling and high false-claim risk.
   - Effort: Very High.
   - Decision: Reject for the next phase.

2. **Two-product pilot closure through existing contracts** — Finish the smallest Agronautas field/evidence/report journey and the smallest Iberá operator/explanation/history journey, preserving separate routes, models, copy, and authorization boundaries.
   - Pros: directly improves usable product value; reuses current persistence and tests; does not require external credentials; creates dependencies for later domains without inventing them.
   - Cons: does not deliver the full commercial vision; field index and run history still require additive contracts and queries; production proof remains external.
   - Effort: Medium.
   - Decision: Recommended.

3. **Configuration/evidence-first continuation** — Stop code work and only configure Google/Render/provider credentials and collect external proof.
   - Pros: closes current external evidence gaps.
   - Cons: does not resolve missing product workflows or absent domain contracts; Google/Render setup is explicitly deferred by the request.
   - Effort: Low to Medium, depending on external access.
   - Decision: Keep as a follow-up track, not the next product implementation phase.

## Recommendation

Proceed with Approach 2 in this order:

1. Agronautas Slice A: field index plus existing pilot journey closure.
2. Agronautas Slice B: geometry/read-back/report truth and focused contract coverage.
3. Agronautas Slice C: explanatory risk/climate decision presentation using current evidence.
4. Iberá Slice D: durable operator ingest history over the existing ledger.
5. Iberá Slice E: municipality threshold/trend/forecast explanation and incident timeline.
6. Iberá Slice F only after authoritative geometry is available and verified.

This sequencing preserves the Agronautas/Iberá-Alerta separation, uses real current contracts, and establishes coherent vertical slices before any campaign, market, financial, insurance, or hydraulic domain is introduced. Google credentials, Render proof, and real institutional/agricultural pilot outcomes remain explicit follow-ups rather than hidden assumptions.

## Risks

- The current Agronautas code has a geometry persistence path, but a code path is not the same as a credential-backed or configured production read-back proof.
- Corrientes rice coverage is narrower than the crop enum and marketing vision. Expanding crop labels without coverage/provider/risk evidence would create a false capability claim.
- Existing risk outputs intentionally record engine divergence and undecided canonical selection. A new explanation layer must expose that boundary rather than silently selecting an engine.
- Risk/alert/weather/job timelines are not human business decision history. Calling them decisions, tasks, or campaign history would misrepresent the domain.
- The Iberá durable ledger is suitable for run status and source results, but institutional case management, acknowledgement, escalation, and incident resolution are absent.
- Municipality PostGIS squares and gauge mappings are not proof of official boundaries or hydraulic impact. Geometry must remain gated by provenance and semantic validation.
- Threshold comparison can explain a monitored value relative to stored alert/evacuation thresholds; it cannot infer effects on every territorial point or recommend evacuation.
- Forecast rows beyond the supported horizon or without freshness/confidence metadata must not be presented as operational certainty.
- Mock, seam, fallback, and offline-fixture paths are useful for deterministic tests but are not live provider or production pilot evidence.
- `render.yaml` expresses intended deployment ownership, not proof that the deployed Cron, API, database, Redis, providers, or browser journeys are currently operating.
- New shared UI primitives can be reused, but Agronautas decision language and Iberá institutional language, routes, contracts, and authorization must remain separate.
- Adding broad speculative modules now would make later data/provider decisions harder to reverse and would obscure the smallest measurable pilot outcome.

## Ready for Proposal

Yes. The next proposal should be a bounded two-product pilot-closure change beginning with Agronautas field index/geometry/report/evidence and Iberá durable operator history/municipality explanations. It should explicitly exclude campaigns, tasks, market/finance/insurance domains, Google credential setup, authoritative geometry ingestion, hydraulic simulation, and Render production proof until their dependencies are available.
