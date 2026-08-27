## Exploration: Agronautas Big-Picture Product Roadmap

### Scope and evidence boundary

This exploration covers **Agronautas only**. Iberá-Alerta is treated as a separate
product with separate routes, schemas, persistence, vocabulary, deployment
ownership, customers, and operational acceptance. The two products may reuse
typed infrastructure only after that reuse is proven; no Iberá capability is
counted as an Agronautas feature.

The repository baseline is `main` at `0e84707` (`feat: harden runtime and
provider evidence`). The previous roadmap in
`docs/agronautas-roadmap-big-picture-corregido.md` is useful historical context,
but its SHA references predate the current baseline and must not override the
current code or the current runtime evidence.

Previously verified evidence is deliberately separated from implementation
contracts:

- `openspec/changes/archive/2026-08-23-agronautas-reality-hardening-provider-foundation/verify-report.md`
  reports the relevant build and focused suites passing, including API/web,
  shared contracts, worker tests, package-local pytest, and one managed
  real-traffic browser run.
- The same report records real HTTP evidence as Georef live, Open-Meteo live
  only with explicit approval, and NASA POWER unavailable for provider missing
  sentinel values.
- That report explicitly keeps worker/queue transition, cron, Render, and
  authenticated real-field acceptance unproven; `productionProven: false` is
  the honest boundary. No production readiness, market viability, customer
  outcome, or regulatory approval is inferred here.

### Current product picture

Agronautas is currently a **field risk and evidence workspace/demo foundation**,
not a complete farm operating system. The strongest existing vertical is:

`field intake → persisted field/context → provider/evidence summaries → risk
snapshot → alert snapshot → dashboard/timeline/PDF/chat`.

The current product has meaningful typed seams for workspace navigation,
geometry, risk, alerts, planning context, assumptions-only simulation,
intelligence capability states, provenance, freshness, and runtime health. It
does not yet have durable human identity/ownership, campaign or operation
records, teams and assignments, source-backed economics, marketplace
transactions, regulated financial decisions, billing, public API governance,
offline synchronization, or a proven production worker topology.

The product strategy should therefore progress from **trusted field evidence**
to **repeatable decisions and operations**, then to **economics and ecosystem**.
It should not start with a broad ERP rewrite, an unqualified AI recommendation,
or a marketplace before the underlying ownership, evidence, and support loops
exist.

## Current State

### Architectural and contract baseline

- `apps/api/src/domain/entities/agronautas.ts` contains the current `Field`,
  `FieldContext`, risk snapshot foundation, and supported-area/crop guards.
  `Field` currently requires province `AR-W`, supported crop/category, positive
  hectares, valid coordinates, and optional polygon metadata.
- `apps/api/src/domain/repositories/agronautas.ts` defines ports for fields,
  field context, geometry, risk snapshots, alerts, signals, workspace activity,
  recompute locks, job runs, and runtime dispatch. The ports are useful seams,
  but most are field-centric rather than tenant/actor-centric.
- `packages/zod-schemas/src/agronautas.ts` is the shared source of truth for
  Agronautas contracts. It has const-backed enums and typed states for fields,
  signals, evidence, risk, alerts, workspace, planning, intelligence, and chat.
  It intentionally uses unavailable/insufficient states instead of fabricated
  values.
- `apps/api/prisma/schema.prisma` uses PostgreSQL/PostGIS-compatible types and
  persists fields, a default workspace, contexts, signal ingestion runs, risk
  snapshots, alert snapshots, copilot thread references, and job runs. It does
  not contain users, memberships, organizations, roles, campaigns, tasks,
  budgets, purchases, billing, or claims.
- `apps/web/src/app/api/agronautas/[...path]/route.ts` is a BFF proxy. It
  forwards selected headers and injects a configured bearer token; it is not a
  user identity provider.
- `apps/web/src/components/agronautas/workspace.tsx`, `page-client.tsx`, and
  `field-detail.tsx` provide the current Agronautas UX: intake, field list,
  dashboard, risk/alerts, evidence state, geometry editing, planning/intelligence
  panels, reports, and chat. `apps/web/src/store/agronautas-store.ts` only keeps
  selected field, last-created field, and intake error state.
- The current TypeScript and Python paths still require a future canonical
  decision. `ComputeFieldRiskUseCase` uses `risk-v0` and the Python worker path
  computes a separate `open-meteo-basic-v1`-style result. Shared contract and
  runtime hardening exist, but canonical engine selection remains explicitly
  `undecided` in planning/intelligence contracts.

### Product status vocabulary used below

- **Exists**: implemented in current code and contract surface.
- **Partial**: a typed seam, UI, persistence fragment, or test exists, but the
  end-to-end product capability is incomplete.
- **Dead/unavailable**: the name or seam exists, but the capability is disabled,
  placeholder-only, credential-blocked, or not proven in runtime.
- **Misleading risk**: a demo/static value or route could be read as a live
  product claim unless the UI and contract state make its status explicit.

## Product surface audit

### 1. Identity, authentication, ownership, and tenancy

- **Exists:** `apps/api/src/presentation/middleware/agronautas-auth.ts`
  provides `reader`, `operator`, and `admin` shared bearer tokens with `read`,
  `write`, `recompute`, and `admin` scopes. The BFF can inject an operator token.
  The management foundation persists one default workspace.
- **Partial:** authentication is route-level access, not a user identity,
  organization, tenant membership, field ownership, or delegated authority.
  `Workspace` has no membership relation. Current field access proves field
  existence, not ownership. The management specification explicitly forbids
  implying ownership or collaboration.
- **Dead/misleading:** treating the shared token or the default workspace as a
  customer account would be a false product claim. A demo field is not proof of
  a tenant's private data.
- **Buildable now:** define identity/organization/membership ports, migration
  boundaries, request actor context, ownership policy tests, and a migration
  plan without exposing private data until the auth provider contract is chosen.
- **Credentials/licensed data:** the actual authentication provider and
  production secrets are deployment-gated. No credential is present in this
  exploration.
- **Business/regulatory decision:** who owns a field, whether advisors can
  access multiple producers, role inheritance, invitations, data export/delete,
  and whether one customer can span multiple legal entities.
- **Dependencies:** auth-security contract, workspace model, field ownership
  policy, audit semantics, billing account identity.
- **Acceptance evidence:** authenticated requests contain an actor and tenant
  context; cross-tenant field access is denied; role changes are auditable;
  anonymous/demo routes cannot read private fields; migration and API/UI tests
  prove no default-workspace backdoor remains.

### 2. Field administration and agronomic operations

- **Exists:** field intake, crop/category, hectares, locality, centroid, polygon
  input, field index, field detail, growth-stage context, risk, alerts, activity
  projection, and geometry metrics. See `CreateFieldIntakeUseCase`,
  `UpdateFieldGeometryUseCase`, `FieldRepository`, and the `/fields` routes.
- **Partial:** field metadata is not an operational master-data model. There is
  no farm/property hierarchy, subfield/management zone, soil sample, crop
  history, irrigation asset, equipment, input inventory, or actual operation
  record.
- **Dead/misleading:** the current `activity` projection is explicitly derived
  from field/risk/alert/ingestion/recompute records; it is not an operator audit
  history and must not be presented as work performed.
- **Buildable now:** typed field master-data extensions, archival/versioning,
  management-zone references, operator notes, and evidence-linked operation
  templates, beginning with one producer-owned workspace.
- **Credentials/licensed data:** cadastral/official boundaries, soil layers,
  map/geocoding, and equipment/IoT data require provider and attribution
  decisions.
- **Business/regulatory decision:** field identity authority, land-tenure
  semantics, agronomist sign-off, record retention, and whether an operation is
  merely planned, started, completed, or verified.
- **Dependencies:** identity/tenancy, geometry governance, campaign model,
  observation ledger, audit trail.
- **Acceptance evidence:** create/edit/archive a field under the correct tenant;
  geometry/version conflicts are deterministic; every agronomic operation has
  actor, timestamp, status, field/zone, and evidence references; existing risk
  lineage remains intact.

### 3. Campaigns, seasons, and planting plans

- **Exists:** `/planning/context` and `/planning/simulate`; `GetCampaignPlanningContext`
  resolves fields against `agronautas-default-workspace`. The context is
  explicitly `persistent: false`, and planning availability marks soil, prices,
  FX, and external economics unavailable.
- **Partial:** `campaignName` and `season` are request values only. There is no
  durable campaign, season calendar, crop rotation, planting plan, version,
  approval, or selected alternative.
- **Dead/misleading:** the assumptions calculator is not a forecast,
  profitability claim, recommendation, or market fact. Calling it a farm plan
  would overstate the current capability.
- **Buildable now:** persist a minimal campaign draft after identity exists;
  attach fields and crop intentions; version assumptions; expose draft/approved/
  archived state; keep the calculator deterministic and clearly labelled.
- **Credentials/licensed data:** none required for persistence itself; source
  weather/soil/yield/price inputs are provider-gated when used as facts.
- **Business/regulatory decision:** season convention, crop-history authority,
  plan approval, agronomist responsibility, and whether a plan is a record or a
  recommendation.
- **Dependencies:** ownership, field master data, operation/task model,
  evidence ledger, economics model.
- **Acceptance evidence:** a tenant can create and revise a campaign without
  mutating source evidence; plan versions are reproducible; assumptions and
  observed values are visibly distinct; unavailable inputs never become zero.

### 4. Tasks, teams, roles, approvals, and audit

- **Exists:** route scopes and a read-only activity projection. Job runs have
  lifecycle metadata and worker lease fields.
- **Partial:** roles are global transport scopes, not team membership or
  responsibility. No task, assignee, checklist, approval, comment, decision,
  immutable audit event, or notification target exists.
- **Dead/misleading:** a job run or activity item must not be shown as a human
  task completed by a person. `createdAt` is not approval evidence.
- **Buildable now:** a small append-only task/decision/approval module with
  field/campaign links, explicit actor, due date, status, and evidence refs.
  Start with task assignment and approval of a plan or operation; do not build a
  generic workflow engine.
- **Credentials/licensed data:** no external credentials for the domain model;
  email/push delivery is provider-gated.
- **Business/regulatory decision:** separation of duties, delegation, legal
  audit retention, signature/e-signature requirements, and whether agronomic
  approvals carry professional liability.
- **Dependencies:** identity, campaign, notification, document, audit storage.
- **Acceptance evidence:** unauthorized actors cannot assign/approve; every
  state transition records actor/time/reason; approval cannot be overwritten;
  audit export reconstructs the decision without relying on Redis logs.

### 5. Field geometry and map-provider strategy

- **Exists:** PostGIS-compatible point/multipolygon columns; WKT/GeoJSON
  normalization and deterministic polygon metrics in
  `apps/api/src/domain/geometry/field-geometry.ts`; optimistic geometry version
  check; `FieldGeometryEditor` and a non-cartographic vertex editor.
- **Partial:** `geometrySource` supports `operator`, `google`, and `fallback`,
  but the current UI states that Google Maps is disabled when the restricted
  public key/capability is absent. Boundary provenance is a metadata object and
  Corrientes source is still a placeholder in the shared contract.
- **Dead/unavailable:** no live Google map/geocoding/routing claim is supported
  without a billing-enabled, restricted key and verified browser/runtime proof.
  Generated or fallback geometry is not official cadastral geometry.
- **Buildable now:** provider-neutral map port, operator draw/edit, import/export
  of WKT/GeoJSON, geometry version history, source review state, area QA, and
  explicit point-only/unavailable UI. A map provider can remain optional.
- **Credentials/licensed data:** Google Maps and geocoding billing/key
  restrictions; official cadastral/IDERA/IGN/territorial datasets and attribution.
- **Business/regulatory decision:** authoritative boundary source, acceptable
  positional accuracy, property/lease semantics, and whether geometry can drive
  alerts, insurance, or compliance.
- **Dependencies:** ownership, provider policy, observation/evidence lineage,
  risk spatial semantics.
- **Acceptance evidence:** invalid/self-intersecting polygons are rejected;
  server metrics are authoritative; stale writes return conflict; every map or
  export labels source/version/status; no UI says “official” for fallback data.

### 6. Observations, evidence, and provenance

- **Exists:** `SignalIngestionRun`, `EvidenceEnvelope`, `signalEvidenceSchema`,
  `observationMetadataSchema`, provider mode (`live`, `seam`, `mock`,
  `unavailable`), raw payload lineage, timestamps, units, freshness, schema/HTTP
  status, run/request IDs, and degradation reasons.
- **Partial:** evidence is primarily signal/risk-oriented and stored in JSON
  payloads or summaries. There is no generalized immutable observation catalog
  for soil samples, prices, yield, invoices, user evidence, documents, or
  provenance review/versioning.
- **Dead/misleading:** fixture tests and injected fetches prove parsing, not live
  provider availability. Demo `sentinel` or weather references do not prove a
  current satellite observation.
- **Buildable now:** make an append-only observation ledger with typed source,
  subject, measurement, unit/currency, observed/retrieved times, quality,
  lineage, review state, retention policy, and supersession links. Reuse the
  current envelope rather than inventing an unrelated contract.
- **Credentials/licensed data:** each source's API terms, commercial use,
  attribution, retention rights, and credential scope must be checked.
- **Business/regulatory decision:** evidence acceptance/review authority,
  correction policy, retention, customer-visible provenance, and legal status of
  a user-uploaded photo, invoice, or agronomist note.
- **Dependencies:** all future intelligence, economics, reports, alerts,
  claims, and audit flows.
- **Acceptance evidence:** a value can be traced from UI to observation to
  provider run; stale/latest-good behavior preserves age and lineage; correction
  creates a new version; no unavailable capability serializes a usable value.

### 7. Weather, soil, satellite, and remote sensing

- **Exists:** Open-Meteo and NASA POWER adapters, Georef normalization, climate
  summaries, satellite signal types, `agronautas-satellite-adapter.ts`, scheduled
  cadence definitions, and explicit freshness/degradation states. NASA POWER and
  Open-Meteo timestamp/unit semantics are encoded in the evidence contract.
- **Partial:** satellite and soil paths are adapter/seam and summary contracts,
  not verified end-to-end production sources. `sentinel-stac` is an injectable
  seam; the source cadence is enabled, but the archived runtime verification did
  not prove a live satellite pipeline. Soil is represented as unavailable in
  planning/intelligence.
- **Dead/unavailable:** official INTA soil access, SoilGrids substitution,
  Sentinel/Copernicus credentials or commercial terms, NASA FIRMS key, and
  SINARAME are not live Agronautas product capabilities. `radar-sinarame` is
  explicitly disabled.
- **Buildable now:** provider ports, source registry, sample/observation review,
  local contract fixtures, freshness calculators, and a first live weather
  vertical where license/approval is explicit. Keep soil/satellite unavailable
  until a source contract and real run are proven.
- **Credentials/licensed data:** Sentinel/Copernicus or STAC access, NASA FIRMS
  key, commercial Open-Meteo terms, INTA/SoilGrids license/attribution, and any
  radar access.
- **Business/regulatory decision:** whether modeled/reanalysis data may support
  operational advice; required agronomic validation; acceptable revisit,
  resolution, cloud handling, and regional coverage.
- **Dependencies:** observation ledger, scheduler/worker topology, risk-engine
  canonicalization, field geometry, provider policy.
- **Acceptance evidence:** real HTTP run has source URL, provider mode, units,
  timestamps, schema status, latency, raw lineage, and freshness; missing or
  sentinel values yield unavailable/degraded; no scheduler success is claimed
  without worker persistence.

### 8. Risk and recommendations

- **Exists:** `ComputeFieldRiskUseCase`, `RiskSnapshotFoundation`, risk drivers,
  confidence, valid-until/freshness, alert generation, stale/degraded states,
  evidence references, and deterministic grounded chat actions.
- **Partial:** two runtime implementations exist; rule/engine selection is still
  undecided. Current drivers are a compact `heat_pressure`, `rainfall_load`,
  `satellite_stress`, and growth-stage sensitivity score, not a validated
  agronomic model. Recommendation is represented as unavailable or
  insufficient-evidence in intelligence.
- **Dead/misleading:** a score is not yield, profitability, agronomic truth,
  insurance risk, or a guaranteed recommendation. Copilot fallback text is not
  a licensed agronomist or authority.
- **Buildable now:** canonical risk contract/engine decision, explainable rule
  registry, golden cross-runtime fixtures, engine versioning, uncertainty and
  evidence review, and recommendation blockers. Keep recommendations
  evidence-gated and human-reviewed.
- **Credentials/licensed data:** validated agronomic datasets, soil/crop history,
  local calibration, and any third-party model/license.
- **Business/regulatory decision:** who may act on risk, liability disclaimer,
  agronomist review, alert severity policy, and whether recommendations can
  trigger automatic tasks.
- **Dependencies:** field/context, evidence ledger, geometry, scheduler/worker,
  audit, task/approval, economics.
- **Acceptance evidence:** same inputs produce the same canonical output across
  runtimes; every driver has input evidence and version; stale/missing data
  lowers confidence or blocks action; user-facing copy distinguishes score,
  alert, recommendation, and decision.

### 9. Economic model: costs, prices, FX, yield, scenarios, budgets, cash flow,
and procurement

- **Exists:** `assumptionSimulationRequestSchema` and
  `calculateAssumptionSimulation` calculate user-supplied area, yield, price,
  variable cost, fixed cost, currency, units, and assumptions. Intelligence and
  planning explicitly mark soil, prices, FX, and external economics unavailable.
- **Partial:** the calculator is not persisted and has no source-backed prices,
  cost catalog, yield history, FX time series, taxes, financing, budget, cash
  flow, invoice, purchase, or scenario comparison ledger.
- **Dead/misleading:** static landing metrics, demo values, or assumptions must
  not be shown as current prices, expected yield, margin, ROI, or market
  viability. No market data is claimed here.
- **Buildable now:** source-neutral monetary observation contracts, user-owned
  cost templates, budget drafts, scenario versioning, sensitivity tables, and
  cash-flow arithmetic that clearly separates facts, assumptions, and outputs.
  Procurement should initially be a private requisition/approval flow, not a
  marketplace.
- **Credentials/licensed data:** verified price/commodity feeds, BCRA/FX source,
  market/licensed data, tax/finance rules, and provider terms. Prior research
  found several official pages/endpoints not yet verified as stable machine-
  readable production APIs.
- **Business/regulatory decision:** currency/base date, price source authority,
  tax treatment, unit conversions, credit terms, accounting ownership,
  profitability definitions, and disclaimer/liability.
- **Dependencies:** identity, observation ledger, campaign/operations, document
  and procurement model, billing/accounting integration.
- **Acceptance evidence:** each monetary value has source, currency, unit,
  observed/retrieved time and lineage; scenario reruns are deterministic;
  missing economics produce insufficient evidence; budgets reconcile and are
  auditable; no zero substitution hides missing data.

### 10. Marketplace and logistics

- **Exists:** no marketplace, supplier, buyer, offer, inventory, quote, order,
  shipment, route, or delivery contract was found in Agronautas code or Prisma.
- **Partial:** the field/workspace and future planning concepts could provide a
  future subject for procurement, but there is no demand/supply identity or
  transaction authority.
- **Dead/misleading:** roadmap/landing language about marketplace,
  commercialization, or export opportunity is vision, not delivered market
  access.
- **Buildable now:** discovery-only supplier directory or private procurement
  request linked to a campaign, with no payment, fulfillment, price guarantee,
  or public ranking. Validate repeated user demand before a marketplace.
- **Credentials/licensed data:** supplier/product data, logistics routing,
  payment provider, tax invoicing, marketplace terms, and potentially regulated
  commodity handling.
- **Business/regulatory decision:** platform vs agent role, liability, moderation,
  KYC/KYB, commissions, dispute handling, delivery terms, and transaction
  jurisdiction.
- **Dependencies:** tenant identity, economics/procurement, documents, billing,
  notifications, support operations.
- **Acceptance evidence:** a procurement request has an owner, approval, quote
  provenance, status, and audit trail; no public listing is created from private
  field data; failed payment or delivery is recoverable and visible.

### 11. Credit, insurance, and claims

- **Exists:** risk snapshots, evidence lineage, reports, and field geometry are
  potentially useful as a review packet.
- **Partial:** no lender/insurer integration, eligibility policy, underwriting
  model, policy, coverage, claim, adjuster, parametric trigger, or indemnity
  record exists.
- **Dead/misleading:** a field risk score is not credit scoring, insurance
  underwriting, coverage confirmation, or a claim decision. Any insurance
  language is future scope.
- **Buildable now:** evidence packet/export for an authorized reviewer, with
  explicit non-decision status and human review. Do not calculate premium,
  approval, payout, or coverage.
- **Credentials/licensed data:** regulated financial/insurance partners,
  approved data sharing, KYC/KYB, underwriting data, policy terms, and local
  regulatory advice.
- **Business/regulatory decision:** licensed role, consent, adverse-action
  notices, explainability, model governance, retention, and claims authority.
- **Dependencies:** identity/consent, canonical risk, evidence ledger, reports,
  audit, partner contracts.
- **Acceptance evidence:** partner exports are consented, scoped, versioned, and
  immutable; UI says review support only; no automated approval or indemnity
  outcome is emitted.

### 12. Documents, reports, and exports

- **Exists:** `/fields/:fieldId/dashboard.pdf`, report metadata schema, PDF text
  rendering, evidence/lineage references, and UI report actions.
- **Partial:** reports are field-dashboard snapshots rather than a document
  library or signed/versioned operational record. There is no object storage,
  upload, retention, signature, export job, or tenant-scoped sharing model.
- **Dead/misleading:** a generated PDF is not a certified agronomic, financial,
  cadastral, insurance, or regulatory document.
- **Buildable now:** versioned evidence report, CSV/JSON export, document
  metadata, tenant-scoped download, and deterministic report generation. Keep
  signing and regulated statements out of the first slice.
- **Credentials/licensed data:** object storage, email/share provider, e-sign
  provider, and any licensed report content.
- **Business/regulatory decision:** document retention, legal hold, signature
  authority, export portability, redaction, and customer data deletion.
- **Dependencies:** identity, audit, observation ledger, campaigns/tasks,
  billing/entitlements.
- **Acceptance evidence:** export contains contract version, subject, source
  times, evidence state, engine version, and generation time; authorization is
  enforced; regenerated output is reproducible for the same snapshot.

### 13. Alerts and notifications

- **Exists:** `AlertSnapshot`, alert current/timeline routes, deterministic
  alert generation from risk drivers, stale/degraded alert states, and UI
  freshness/provenance badges.
- **Partial:** alerts are field snapshots, not user-configured subscriptions,
  delivery events, acknowledgements, escalation, task creation, or incident
  cases. No email, SMS, push, or in-app notification persistence exists.
- **Dead/misleading:** an alert snapshot is not proof that a human was notified
  or acted. A stale alert must not be presented as a current trigger.
- **Buildable now:** in-app notification inbox, user/tenant subscriptions,
  deduplication, delivery status, acknowledgement, and optional task handoff;
  preserve alert lineage and avoid automatic external messages initially.
- **Credentials/licensed data:** email/SMS/push provider credentials and consent
  or anti-spam controls.
- **Business/regulatory decision:** severity, quiet hours, escalation ownership,
  emergency disclaimer, acknowledgement meaning, and notification retention.
- **Dependencies:** identity/roles, alert engine, tasks/approvals, worker,
  observability.
- **Acceptance evidence:** one alert event has deterministic idempotency,
  tenant/user delivery status, retry/DLQ, visible stale state, and an audit trail
  from trigger to acknowledgement.

### 14. Integrations: ERP, IoT, equipment, and external systems

- **Exists:** typed provider adapters, BFF, Redis/Postgres job seams, hydrology
  adapters, and generic workflow contracts. No Agronautas ERP or IoT connector
  is currently a product integration.
- **Partial:** the runtime can carry jobs and evidence but has no stable public
  integration registry, connector credentials, mapping/versioning, inbound
  deduplication, or tenant-specific sync state.
- **Dead/unavailable:** an adapter or schema fixture is not a connected ERP,
  sensor, telemetry gateway, or partner account.
- **Buildable now:** connector port, tenant-scoped credential reference,
  mapping/version contract, idempotent import, sync cursor, and one read-only
  export/import pilot. Start with CSV or a single agreed ERP, not “all ERPs”.
- **Credentials/licensed data:** ERP/IoT vendor APIs, device certificates,
  network access, data licenses, and secret storage.
- **Business/regulatory decision:** system of record, conflict resolution,
  write-back authority, support ownership, data processing terms, and sensor
  calibration responsibility.
- **Dependencies:** identity, observation/operation ledger, workers, public API
  governance, observability.
- **Acceptance evidence:** connector runs are replay-safe, scoped to a tenant,
  show source/version/cursor/failure, and never silently overwrite field or
  economic facts.

### 15. Analytics, AI, and copilot

- **Exists:** `GroundedChatUseCase`, deterministic action selection/fallback,
  citations to risk/alert snapshots, Groq integration seam, hydrology SSE
  copilot (Iberá boundary), intelligence contract, and telemetry events.
- **Partial:** Agronautas chat currently covers field overview, risk summary,
  alerts, comparison, and final response. It is not a general agronomic agent,
  workflow orchestrator, analytics warehouse, experiment platform, or long-term
  memory. Recommendation capability is blocked when evidence is incomplete.
- **Dead/misleading:** LLM output does not become evidence, approval, authority,
  or a guarantee. A fallback answer is not proof that Groq or a live dataset was
  used. Iberá Copilot must remain in its own hydrology route/service boundary.
- **Buildable now:** event/activity analytics, saved views, evidence-linked
  explanations, prompt/action audit, deterministic tool contracts, and a narrow
  Agronautas copilot that can draft a task or report only after explicit user
  confirmation.
- **Credentials/licensed data:** Groq/LLM credentials, model terms, vector/search
  infrastructure, training/evaluation data, and potentially agronomic content
  licenses.
- **Business/regulatory decision:** human-in-the-loop, data retention/training
  opt-out, model evaluation, explainability, prompt injection policy, and
  professional advice boundary.
- **Dependencies:** identity, observation/evidence ledger, risk canonicalization,
  tasks/approvals, analytics events, rate limits, observability.
- **Acceptance evidence:** every answer identifies supporting facts and
  citations; unavailable data produces degraded response; proposed mutations
  require confirmation; prompts/outputs are access-controlled and auditable;
  UI never conflates prediction with observation.

### 16. Billing, plans, and entitlements

- **Exists:** demo contact capture and product UI, but no billing model, plan,
  subscription, invoice, entitlement, quota, trial, or payment integration.
- **Partial:** commercial positioning exists in strategy documents, not in
  enforceable application contracts.
- **Dead/misleading:** a demo contact form or public page is not a paid plan or
  proof of willingness to pay. No market viability claim is made.
- **Buildable now:** entitlement port and local plan matrix keyed by tenant,
  with usage counters for fields, provider runs, exports, seats, and copilot
  requests. Enforce feature access independently from UI hiding.
- **Credentials/licensed data:** payment processor, tax/invoicing provider,
  subscription webhooks, and secrets.
- **Business/regulatory decision:** packaging, seat vs hectare vs usage pricing,
  trials, refunds, taxes, regional currency, overage, data retention after
  cancellation, and support SLA.
- **Dependencies:** identity/tenant account, public API limits, notifications,
  documents, observability.
- **Acceptance evidence:** entitlement checks are server-side and tested;
  webhook replay is idempotent; canceled/expired plans have deterministic
  behavior; no private data is deleted before retention policy permits it.

### 17. Public APIs and webhooks

- **Exists:** internal Agronautas routes, shared Zod contracts, BFF proxy, and
  request IDs. The current route surface is application-internal and uses
  shared/global token semantics.
- **Partial:** no public API versioning policy, developer identity, API keys,
  OAuth scopes, tenant isolation, rate-limit product, webhook subscriptions,
  signing, replay protection, or deprecation policy.
- **Dead/misleading:** publishing `/api/agronautas` as a partner API now would
  expose unresolved ownership, runtime, and entitlement boundaries.
- **Buildable now:** internal contract catalog, API version policy, stable error
  envelope, idempotency keys, request/correlation tracing, and a read-only
  private beta for one integration after identity exists.
- **Credentials/licensed data:** API gateway/key management, partner secrets,
  webhook delivery provider, and developer support operations.
- **Business/regulatory decision:** data export rights, partner liability, quotas,
  SLA, version support, webhook event semantics, and tenant consent.
- **Dependencies:** identity, entitlements, audit, observability, integration
  registry, durable worker.
- **Acceptance evidence:** contract tests cover version/error/idempotency;
  authorization and quotas are tenant-scoped; webhook signatures and replay
  handling are verified; provider/worker failures are observable to consumers.

### 18. Offline and mobile

- **Exists:** responsive web components and narrow Zustand selection state. No
  offline queue, local database, conflict protocol, native app, installable PWA,
  sensor capture, or mobile-specific upload contract exists.
- **Partial:** geometry editing and intake could become field-friendly, but they
  currently depend on online backend validation and do not persist offline
  mutations.
- **Dead/misleading:** a responsive screen is not offline support or a mobile
  product.
- **Buildable now:** mobile web/PWA read cache, draft-only intake, explicit sync
  status, upload retry, and conflict-safe geometry drafts. Defer offline writes
  to tasks/operations until actor and conflict semantics are established.
- **Credentials/licensed data:** maps, GPS, camera/storage permissions, push
  notification service, and mobile distribution accounts if native.
- **Business/regulatory decision:** offline data sensitivity, device loss,
  retention/encryption, conflict authority, and whether field staff may create
  legally meaningful records offline.
- **Dependencies:** identity, observation/doc storage, sync worker, audit,
  notification.
- **Acceptance evidence:** offline/online transitions are tested; drafts never
  masquerade as persisted facts; replay is idempotent; conflicts are surfaced
  to a human; sensitive cache is cleared per policy.

### 19. Governance and compliance

- **Exists:** typed provenance/freshness, explicit degraded states, shared role
  middleware, contract error handling, and evidence-oriented reports.
- **Partial:** no tenant data policy, consent ledger, retention/prune policy for
  Agronautas records, deletion/export workflow, model governance register,
  incident process, or compliance control catalog.
- **Dead/misleading:** technical provenance is not legal compliance, certification,
  agronomic licensure, cadastral authority, or financial regulation approval.
- **Buildable now:** data classification, consent and retention contracts,
  access audit events, model/source registry, incident/runbook templates, and
  export/delete request workflow.
- **Credentials/licensed data:** legal counsel, DPA/terms, provider licenses,
  e-signature, data residency and security tooling.
- **Business/regulatory decision:** jurisdictions, personal/financial/agronomic
  data classification, professional advice, records retention, AI usage,
  breach notification, and partner responsibility.
- **Dependencies:** identity, audit, documents, billing, AI, finance/insurance,
  support operations.
- **Acceptance evidence:** access/export/delete requests are traceable;
  retention jobs are bounded and reversible where required; compliance claims
  are backed by an approved control and evidence, not a UI badge.

### 20. Reliability, workers, cron, and observability

- **Exists:** Redis locks/dispatcher, job-run persistence, leases, heartbeat,
  retry/DLQ methods, scheduler cadence definitions, telemetry events, health and
  runtime endpoints, and provider latency/status logging.
- **Partial:** the archived verification proves contracts and fake/injected
  paths but not the full deployed topology. The current runtime contract keeps
  worker unavailable and scheduler disabled when readiness is unproven. The
  exact API→Redis→Python worker→Postgres transition remains production-gated.
- **Dead/misleading:** a planned scheduler window or passing fake-Redis test is
  not an enqueued/completed production job. A healthy API is not worker
  readiness.
- **Buildable now:** canonical engine/job state, durable source windows,
  idempotent workers, operational dashboards, SLO/error taxonomy, replay/DLQ
  tools, and local end-to-end tests. Keep production scheduler disabled until
  the real topology is configured and observed.
- **Credentials/licensed data:** production Postgres/Redis, worker deployment,
  cron owner/token, Render wiring, external provider credentials, and logs.
- **Business/regulatory decision:** RPO/RTO, freshness SLO per signal, incident
  ownership, retry budgets, retention, and whether a stale result can support a
  user action.
- **Dependencies:** every provider, alert, notification, integration, and AI
  mutation.
- **Acceptance evidence:** local contract tests plus a separately captured
  authorized runtime run prove queue transitions, worker lease/heartbeat,
  persisted result/DLQ, scheduler lock, provider evidence, and recovery after
  restart. Until then the UI says unavailable/not proven.

### 21. Commercialization, personas, value loops, and expansion sequencing

- **Exists:** demo/contact surface, Agronautas workspace narrative, and prior
  roadmap framing around producer/advisor value. No verified customer, adoption,
  price, savings, yield, or market-size claim is available in the repository.
- **Partial:** the likely first value loop is visible in the current product:
  select a field → inspect evidence/risk → understand freshness and drivers →
  review alert/report → decide whether to recompute or act. Repeat usage,
  willingness to pay, support burden, and outcome quality are unverified.
- **Dead/misleading:** treating the full vision (ERP, marketplace, credit,
  insurance, autonomous copilot) as one near-term product or claiming viability
  from UI polish would be unsupported.
- **Buildable now:** a narrow pilot instrumented around one field/risk/evidence
  workflow, with explicit personas such as producer, agronomist/advisor, and
  operations reviewer. Measure observed task completion and comprehension, not
  invented ROI.
- **Credentials/licensed data:** pilot data access, provider permissions,
  partner agreements, and any customer-specific ERP or field records.
- **Business/regulatory decision:** target wedge, buyer/user distinction,
  support model, geography/crop, success criteria, pricing hypothesis, and
  expansion gate.
- **Dependencies:** identity, canonical risk/runtime, evidence, reports,
  tasks/approvals, commercial instrumentation.
- **Acceptance evidence:** an authorized pilot user can repeat the selected
  workflow without engineering intervention, understands observed vs inferred
  states, records a decision/task, and provides attributable feedback. No
  customer or viability claim is published without evidence.

## Integration boundaries with Iberá-Alerta

Agronautas and Iberá-Alerta must remain separate products. The current boundary
is visible in code and specs:

- Agronautas uses `apps/api/src/presentation/routes/agronautas.ts`, Agronautas
  schemas and repositories, Agronautas risk/signal/job tables, and
  `apps/web/src/components/agronautas/*`.
- Iberá-Alerta uses `apps/api/src/presentation/routes/hydrology-government.ts`,
  `packages/hydrology-engine`, hydrology/Iberá schemas and tables, and
  `apps/web/src/components/government/*` plus municipality pages.
- The `HydrologyRepository` and hydrology dashboard/copolot calls currently
  appear inside some Agronautas field routes to show hydrology context. This is
  an integration boundary, not shared product ownership: the data remains
  source-attributed hydrology evidence, and Iberá routes, persistence,
  vocabulary, and operational workflows must not be changed by Agronautas
  feature work.
- Safe future integration is a read-only, versioned adapter or evidence
  reference with explicit source/zone/authority semantics. Agronautas must not
  import Iberá municipality ownership, institutional roles, official geometry,
  incident workflows, or deployment readiness.
- No shared queue, risk engine, notification, tenant, or public API should be
  assumed until both products have an explicit contract and independent
  acceptance tests. Shared telemetry/contract libraries are candidates only
  after observed reuse reduces risk.

## Thin-slice multi-release roadmap

The names below are proposed SDD change names, not implementation authorization.
Each is intentionally narrow and should have its own proposal/spec/design/tasks
and strict TDD evidence.

### Release 0 — Baseline and trust (current foundation)

1. **`agronautas-baseline-product-boundaries`** — freeze the current product
   map, evidence vocabulary, supported Corrientes boundary, and explicit
   non-goals. **Priority:** P0 / risk reduction. **Mode:** local-first, then
   documentation/runtime evidence. **Depends on:** current `0e84707`.
2. **`agronautas-runtime-canonical-risk-contract`** — choose and reconcile the
   TypeScript/Python risk contract, job lifecycle, scheduler capability, and
   worker readiness. **Priority:** P0 / pilot blocker. **Mode:** local contract
   tests first; production-gated for worker/Redis/Postgres/cron proof.
3. **`agronautas-identity-workspace-ownership`** — introduce actor, tenant,
   workspace membership, field ownership, and request authorization without
   changing Iberá. **Priority:** P0 / security and commercialization blocker.
   **Mode:** local-first migrations/tests; production-gated auth provider and
   private-field smoke.
4. **`agronautas-evidence-ledger-foundation`** — generalize current evidence
   envelopes into immutable observation/provenance records with review and
   supersession. **Priority:** P0 / trust foundation. **Mode:** local-first;
   provider-specific live acceptance is production-gated.

### Release 1 — Pilotable field operations

5. **`agronautas-field-registry-geometry-governance`** — field hierarchy,
   geometry source/version/review, management zones, and provider-neutral map
   port. **Priority:** P0 / direct field value. **Mode:** local-first with
   operator geometry; Google/official boundary usage production/licensing-gated.
6. **`agronautas-management-tasks-decisions-audit`** — tasks, assignments,
   decisions, approvals, and append-only audit for one workspace/campaign.
   **Priority:** P0 / repeatability. **Mode:** local-first, production-gated
   for real actors and notifications.
7. **`agronautas-campaign-season-plan-drafts`** — durable campaign/season
   drafts, field membership, crop intentions, plan versions, and explicit
   assumptions. **Priority:** P1 / workflow value. **Mode:** local-first;
   production-gated for tenant-owned records.
8. **`agronautas-alert-notification-inbox`** — in-app alert subscriptions,
   deduplication, acknowledgement, and task handoff while retaining snapshot
   lineage. **Priority:** P1 / action loop. **Mode:** local-first; external
   delivery production-gated.
9. **`agronautas-pilot-evidence-reporting`** — field report, evidence timeline,
   CSV/JSON/PDF export, and pilot instrumentation. **Priority:** P0 / proof of
   value. **Mode:** local-first; pilot/production data and sharing are gated.

### Release 2 — Agronomic intelligence and planning

10. **`agronautas-weather-soil-satellite-verified-sources`** — one source-backed
    vertical at a time, starting with weather, then soil/satellite only after
    credentials, licensing, and validation. **Priority:** P1 / evidence value.
    **Mode:** local contract tests; real provider runs are production-gated.
11. **`agronautas-risk-explanation-and-recommendation-gates`** — canonical
    explainable risk, engine registry, human review, and recommendation blockers.
    **Priority:** P0 / safety. **Mode:** local-first; agronomic validation and
    real customer operation are production/policy-gated.
12. **`agronautas-campaign-planning-scenarios`** — persist assumption versions,
    calendars, constraints, sensitivity analysis, and comparison of plans.
    **Priority:** P1 / planning value. **Mode:** local-first; source-backed
    forecast semantics and user adoption are gated.
13. **`agronautas-economic-observation-budget-cashflow`** — verified monetary
    observations, cost catalogs, yield history, budgets, cash flow, FX, and
    scenario audit. **Priority:** P1 / commercial value with high truth risk.
    **Mode:** local-first arithmetic/contracts; all market/FX/yield sources and
    financial claims production/business-gated.
14. **`agronautas-copilot-confirmed-actions-analytics`** — evidence-cited
    analytics and a narrow copilot that drafts reports/tasks but requires
    confirmation for mutations. **Priority:** P1 / productivity. **Mode:**
    local-first deterministic tools; LLM credentials, privacy, and evaluation
    are production-gated.

### Release 3 — Commercial workflow and integrations

15. **`agronautas-procurement-requisition-and-logistics`** — private requisitions,
    quotes, approval, and delivery status; no public marketplace yet.
    **Priority:** P2 / validate demand. **Mode:** local-first; supplier/logistics
    integrations and payments production-gated.
16. **`agronautas-erp-iot-connector-foundation`** — connector registry, scoped
    credentials, mappings, cursors, idempotent imports, and one validated
    connector. **Priority:** P2 / expansion. **Mode:** local-first fixtures;
    vendor accounts and real write-back production-gated.
17. **`agronautas-billing-plans-entitlements`** — tenant plans, usage quotas,
    entitlements, payment webhook boundary, and cancellation behavior.
    **Priority:** P1 after pilot demand. **Mode:** local-first entitlement tests;
    payment/tax/webhook production-gated.
18. **`agronautas-private-api-webhooks`** — versioned read API, developer
    identity, quotas, signed webhooks, replay protection, and private beta.
    **Priority:** P2 / only after internal contracts stabilize. **Mode:**
    local-first; partner credentials and SLA are production-gated.
19. **`agronautas-mobile-offline-field-capture`** — PWA/mobile drafts, offline
    read cache, evidence/photo capture, sync and conflict handling. **Priority:**
    P2 / field usability. **Mode:** local-first; push/maps/device permissions
    and real device pilot are production-gated.

### Release 4 — Regulated and ecosystem expansion

20. **`agronautas-review-packets-for-credit-insurance`** — authorized evidence
    packets only; no underwriting, premium, approval, payout, or claims decision.
    **Priority:** P3 / partner-dependent. **Mode:** local-first export and
    consent tests; licensed partners and regulatory review production-gated.
21. **`agronautas-claims-evidence-and-human-review`** — if a real partner
    requires it, add claim intake, evidence chain, adjuster review, and decision
    handoff with human authority. **Priority:** P3 / regulated. **Mode:**
    production/regulatory-gated from inception.
22. **`agronautas-governance-compliance-operations`** — retention, consent,
    data export/delete, model/source registry, incident controls, and support
    evidence. **Priority:** P1 cross-cutting. **Mode:** local-first control
    tests; legal/production evidence gated.
23. **`agronautas-scale-reliability-platform-reuse`** — only extract shared
    contracts, telemetry, jobs, reports, and operations where reuse is observed
    in Agronautas and Iberá without merging product ownership. **Priority:** P2
    after proven use. **Mode:** production-observed, not speculative platforming.

## Dependency DAG

```text
agronautas-baseline-product-boundaries
├── agronautas-runtime-canonical-risk-contract
│   ├── agronautas-risk-explanation-and-recommendation-gates
│   │   ├── agronautas-campaign-planning-scenarios
│   │   │   ├── agronautas-economic-observation-budget-cashflow
│   │   │   │   ├── agronautas-procurement-requisition-and-logistics
│   │   │   │   └── agronautas-review-packets-for-credit-insurance
│   │   │   └── agronautas-copilot-confirmed-actions-analytics
│   │   └── agronautas-pilot-evidence-reporting
│   └── agronautas-evidence-ledger-foundation
├── agronautas-identity-workspace-ownership
│   ├── agronautas-field-registry-geometry-governance
│   │   └── agronautas-campaign-season-plan-drafts
│   │       └── agronautas-management-tasks-decisions-audit
│   │           └── agronautas-alert-notification-inbox
│   ├── agronautas-billing-plans-entitlements
│   │   └── agronautas-private-api-webhooks
│   └── agronautas-mobile-offline-field-capture
└── agronautas-evidence-ledger-foundation
    └── agronautas-weather-soil-satellite-verified-sources
        └── agronautas-risk-explanation-and-recommendation-gates

agronautas-management-tasks-decisions-audit
├── agronautas-procurement-requisition-and-logistics
├── agronautas-copilot-confirmed-actions-analytics
└── agronautas-review-packets-for-credit-insurance

agronautas-economic-observation-budget-cashflow
└── agronautas-erp-iot-connector-foundation

agronautas-governance-compliance-operations
└── agronautas-scale-reliability-platform-reuse
```

The graph is intentionally conservative. `identity`, `evidence`, and
`runtime/risk` are the three foundations. Campaigns and tasks follow them;
economics follows verified observations; marketplace, API, billing, offline,
credit, and insurance follow demonstrated workflows and explicit policy.

## Local-first versus production-gated work

### Safe local-first lanes

- Pure domain rules and typed contracts: field validation, geometry validation,
  risk fixtures, deterministic scenario math, capability-state serialization,
  idempotency, audit transitions, and entitlement decisions.
- Database migrations tested against disposable or authorized local PostgreSQL;
  repositories tested with contract fixtures and transaction boundaries.
- UI state matrices: loading, empty, unavailable, stale, degraded, forbidden,
  conflict, draft, synced, and confirmed. Use semantic status rather than color
  or illustrative values.
- Provider adapters with injected fixtures, explicitly marked seam/mock, plus
  deterministic parser/schema tests.
- Queue/worker state-machine tests with fake Redis/Postgres, provided they are
  not reported as runtime proof.
- Report/export determinism, evidence lineage, local task/approval flows, and
  offline draft/replay simulations.

### Production/provider-gated lanes

- Real identity provider, tenant isolation, private field access, invitations,
  and customer data deletion/export.
- Google Maps/geocoding/routing, official boundaries, INTA/soil layers,
  Sentinel/Copernicus, NASA FIRMS, commercial Open-Meteo usage, market/FX/
  commodity data, ERP/IoT accounts, payment, email/SMS/push, LLM credentials,
  and regulated partners.
- API→Redis→Python worker→Postgres job completion, retries/DLQ, scheduled
  source windows, cron ownership, restart recovery, and Render topology.
- Customer pilot acceptance, repeated workflow use, supportability, pricing,
  willingness-to-pay, yield/financial outcomes, insurance/credit decisions, or
  legal compliance claims.

## Explicit non-goals

- Do not merge Agronautas and Iberá-Alerta into one product, tenant model,
  route namespace, risk model, or operational owner.
- Do not rewrite the application or replace the current typed ports wholesale.
- Do not build a generic ERP, national agricultural platform, public marketplace,
  or public API before a validated narrow workflow requires it.
- Do not treat shared bearer tokens, a default workspace, demo fields, fixture
  data, static landing metrics, or a passing unit test as identity, ownership,
  live provider evidence, market validation, or production readiness.
- Do not select a canonical risk engine, derive economics from risk, or emit an
  actionable crop recommendation without the evidence and policy gates stated
  in the intelligence specification.
- Do not claim official geometry, soil coverage, current prices, FX, yield,
  profitability, credit eligibility, insurance coverage, claim payout, or
  regulatory approval without verified source/partner evidence.
- Do not enable scheduled ingestion until the real queue/worker path is proven;
  preserve truthful unavailable/not-run states.
- Do not introduce offline writes, autonomous AI mutations, payment capture,
  underwriting, or claims decisions before identity, audit, consent, and human
  responsibility are explicit.
- Do not use Docker, review gates, receipts, freezes, hashes, Judgment Day, or
  blocking lifecycle workflows as part of this exploration.

## Approaches

1. **Evidence-first vertical slices (recommended)** — stabilize identity,
   evidence, runtime/risk, and field operations before adding economics or
   ecosystem modules.
   - Pros: directly extends current contracts; preserves truthful states; keeps
     changes reversible; supports strict TDD; creates value around the existing
     field/risk journey; makes production gates explicit.
   - Cons: requires temporary unavailable/seam states; commercial breadth arrives
     later; source and policy decisions remain visible.
   - Effort: High, but incremental.

2. **ERP-first product rewrite** — build campaigns, tasks, finance, procurement,
   and billing as a broad operating system before hardening evidence and runtime.
   - Pros: broad narrative and many screens quickly.
   - Cons: overstates current data quality; repeats identity/ownership gaps;
     couples many unverified domains; makes stale/provider failures harder to
     explain; high migration and support risk.
   - Effort: Very high.

3. **AI/marketplace-first expansion** — expose recommendations, market offers,
   or financial pathways before durable operations and source governance.
   - Pros: visible differentiation and potentially strong demo appeal.
   - Cons: depends on missing evidence, identity, partners, licensing,
     regulation, moderation, and liability controls; cannot be accepted from
     current runtime evidence.
   - Effort: High with unacceptable truth and governance risk at this stage.

## Recommendation

Use **evidence-first vertical slices**. The first release should not add more
surface area to the UI; it should make the current field/risk/evidence journey
trustworthy by aligning the canonical risk/runtime contract, introducing real
identity/ownership boundaries, and generalizing provenance into a durable
observation ledger. Then add field governance, tasks, campaigns, alerts,
reports, and only afterward source-backed agronomic/economic planning.

Treat commercialization as a measured pilot loop around one repeatable user
journey, not as a claim that the full vision is viable. Treat marketplace,
credit, insurance, billing, public APIs, mobile offline, and platform extraction
as dependent releases with explicit partner, regulatory, or production gates.

## Risks

- The current default workspace can become a hidden multi-tenant bypass unless
  identity and ownership are implemented before private-field use.
- Two risk/runtime implementations can produce contradictory advice unless the
  canonical engine and cross-runtime contract are decided and tested.
- The scheduler/worker path can report success in tests while remaining
  unavailable in deployed topology; production acceptance must remain separate.
- Provider accessibility can be mistaken for commercial permission, coverage,
  freshness, or source validity; every adapter needs explicit licensing and
  timestamp semantics.
- Soil, satellite, market, FX, yield, and geometry gaps can silently contaminate
  recommendations or economics if unavailable states are replaced by defaults.
- Adding tasks, notifications, reports, billing, APIs, or offline writes before
  actor/audit semantics creates irreversible ownership and support problems.
- AI can amplify unsupported claims unless tool outputs, citations, uncertainty,
  confirmation, and retention are contractually enforced.
- Marketplace, credit, insurance, and claims introduce legal, financial,
  partner, moderation, and liability obligations that cannot be solved by UI or
  a risk score.
- Shared infrastructure with Iberá-Alerta can accidentally merge product
  semantics or deployment ownership; integration must remain adapter-based and
  independently accepted.

### Affected Areas

- `apps/api/src/domain/entities/agronautas.ts` — current field/context/risk
  domain invariants and the future boundary for agronomic subjects.
- `apps/api/src/domain/repositories/agronautas.ts` — current ports for fields,
  geometry, evidence summaries, risk, alerts, workspace, and runtime jobs.
- `apps/api/prisma/schema.prisma` and `apps/api/prisma/migrations/*` — existing
  PostgreSQL/PostGIS persistence and the missing identity/operations/economics
  entities.
- `packages/zod-schemas/src/agronautas.ts` — shared typed contracts, evidence
  semantics, planning limitations, intelligence blockers, and chat actions.
- `apps/api/src/presentation/routes/agronautas.ts` — current route surface and
  the boundary that must not become a public API accidentally.
- `apps/api/src/presentation/middleware/agronautas-auth.ts` — shared role token
  scope, not yet actor/tenant/ownership authorization.
- `apps/api/src/application/usecases/compute-field-risk-usecase.ts`,
  `request-risk-recompute-usecase.ts`, and `generate-alerts-usecase.ts` — risk,
  recompute, alert, and runtime sequencing.
- `apps/api/src/infrastructure/adapters/agronautas-provider-adapters.ts`,
  `agronautas-satellite-adapter.ts`, `provider-matrix.ts`, and
  `agronautas-scheduler.ts` — provider modes, signal seams, cadences, and
  production gating.
- `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py`,
  `queue/consumer.py`, and `tests/*` — worker lease, heartbeat, retry, DLQ,
  and the remaining real-topology boundary.
- `apps/web/src/components/agronautas/*`, `apps/web/src/lib/agronautas/*`, and
  `apps/web/src/store/agronautas-store.ts` — current UI journeys and narrow
  client state.
- `apps/api/src/presentation/routes/hydrology-government.ts`,
  `packages/hydrology-engine`, and `apps/web/src/components/government/*` —
  Iberá-Alerta integration boundary; keep separate from Agronautas ownership and
  product expansion.
- `openspec/specs/management-foundation/spec.md`,
  `planning-simulator/spec.md`, `intelligence-foundation/spec.md`, and
  `runtime-evidence-foundation/spec.md` — existing constraints that the roadmap
  must preserve.
- `openspec/changes/archive/2026-08-23-agronautas-reality-hardening-provider-foundation/*`
  — previously verified implementation and runtime limits.

### Ready for Proposal

Yes. The next proposal should choose **one** thin slice rather than open the
whole roadmap. The safest first candidate is
`agronautas-runtime-canonical-risk-contract` if pilot trust is the immediate
goal, or `agronautas-identity-workspace-ownership` if private customer data is
the immediate goal. Both must preserve the existing evidence-first and
Iberá-separation boundaries; neither authorizes the future marketplace,
financial, regulatory, or platform claims.

## Result Contract

- **status:** `SUCCESS`
- **executive_summary:** Agronautas has a credible typed field/risk/evidence
  foundation and a usable workspace surface, but the full product vision is
  blocked by identity/ownership, canonical runtime/risk, durable observations,
  operational records, verified source data, and explicit commercial/regulatory
  decisions. A sequence of thin evidence-first slices is feasible without
  modifying Iberá-Alerta.
- **artifacts:**
  - `openspec/changes/agronautas-big-picture-product-roadmap/exploration.md` —
    this code-grounded product audit and roadmap.
  - `openspec/specs/management-foundation/spec.md` — current read-only workspace
    and no-ownership boundary.
  - `openspec/specs/planning-simulator/spec.md` — current non-persistent,
    assumptions-only planning boundary.
  - `openspec/specs/intelligence-foundation/spec.md` — evidence-gated intelligence
    and recommendation boundary.
  - `openspec/specs/runtime-evidence-foundation/spec.md` — truthful runtime,
    provider, queue, and acceptance boundary.
  - `openspec/changes/archive/2026-08-23-agronautas-reality-hardening-provider-foundation/verify-report.md`
    — previously verified tests/build/provider/browser evidence and explicit
    unproven runtime limits.
- **next_recommended:** Create a proposal for one P0 slice, preferably
  `agronautas-runtime-canonical-risk-contract` or
  `agronautas-identity-workspace-ownership`; do not combine them with campaign,
  marketplace, billing, finance, or insurance scope.
- **risks:** Full production topology, authenticated real-field behavior,
  commercial provider permissions, official soil/satellite/geometry sources,
  market/FX/yield data, customer viability, and regulated partner acceptance
  remain unproven or undecided.
