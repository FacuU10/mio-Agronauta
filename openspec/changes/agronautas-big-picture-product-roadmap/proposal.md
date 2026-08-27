# Proposal: Agronautas Evidence-First Product Roadmap

## Intent

Agronautas has a credible field-intake → evidence → risk/alert → report/chat foundation, but not yet a private farm operating system. This proposal sequences the future into thin, reversible SDD changes that strengthen trust before operations, intelligence, economics, platform distribution, or regulated ecosystem work. It is a roadmap, not an implementation promise, market-success claim, regulatory approval, or production-readiness claim.

Baseline: `main` `0e84707`. Existing tests/builds and selected real provider/browser evidence pass, while authenticated real-field use, API→Redis→Python worker→Postgres completion, cron, Render topology, and production readiness remain unproven (`productionProven: false`).

## Scope

### In Scope
- P0 trust/runtime foundations: canonical contracts, identity/ownership, geometry governance, append-only evidence, worker/queue/cron/Render proof, and observability.
- P1 field operating system and intelligence: durable farm/field operations, campaigns, tasks, evidence-linked reports, qualified providers, explainable risk, and human-gated recommendations.
- P2 economics/platform, P3 partner/regulated evidence workflows, and P4 measured expansion, ecosystem, and monetization—each behind explicit evidence, commercial, and legal gates.
- Strict TDD for every slice: RED contract tests, GREEN implementation, REFACTOR, integration evidence, and separately labeled local versus production-gated acceptance.

### Out of Scope
- A single ERP rewrite, autonomous agronomic/financial agent, fabricated market data, public marketplace, underwriting, claims decisions, or unlicensed advice.
- Merging Agronautas with Iberá-Alerta. Iberá may consume only proven, versioned, read-only infrastructure primitives through explicit adapters.
- Treating fixtures, demo values, shared bearer tokens, a default workspace, passing tests, or planned jobs as live evidence, ownership, customer validation, or production proof.

## Current-State Contract and Runtime Boundary

- Existing code provides `Field`, `FieldContext`, PostGIS-compatible geometry, evidence envelopes, risk/alert snapshots, BFF routes, narrow client state, Redis dispatcher/job contracts, and a Python worker seam.
- `agronautas-auth.ts` supplies route scopes (`reader/operator/admin`), not actors, tenants, memberships, ownership, or collaboration. The default workspace is not a customer boundary.
- Planning is explicitly non-persistent and assumptions-only. Soil, prices, FX, yield, economics, recommendations, marketplace, billing, public APIs, offline writes, and claims are unavailable or absent.
- TypeScript `risk-v0` and the Python risk path coexist; this roadmap requires a canonical output contract and decision record, but keeps engine selection `undecided` until validated inputs, calibration, and accountable ownership exist.
- Georef has live evidence in prior bounded smoke; Open-Meteo is live only with explicit approval; NASA POWER returned documented missing sentinels and remained unavailable. Soil, satellite/Copernicus, FIRMS, and official geometry are not live product capabilities.
- Prior verification reports passing contract/build suites and a managed browser run, but not worker/queue transition, cron, Render, or authenticated real-field acceptance. Every proposal below preserves this distinction.

## Capabilities

### New Capabilities
- `agronautas-baseline-boundaries`: product vocabulary, evidence states, and Agronautas/Iberá separation.
- `agronautas-identity-workspace-ownership`: actors, organizations, memberships, tenancy, ownership, consent, and authorization.
- `agronautas-evidence-ledger`: generalized immutable observations, provenance, review, freshness, and supersession.
- `agronautas-field-registry`: farm/field/subfield/zone master data and geometry governance.
- `agronautas-campaigns`: seasons, crop history, campaigns, planting plans, versions, and approvals.
- `agronautas-operations`: tasks, teams, roles, visits, notes, attachments, decisions, audit, alerts, and notifications.
- `agronautas-reports`: evidence-linked reports, exports, and pilot instrumentation.
- `agronautas-verified-intelligence`: qualified weather/soil/satellite/fire sources, calibration, explanations, and recommendation gates.
- `agronautas-economics`: source-backed prices, FX, costs, yield, budgets, cash flow, scenarios, procurement, and logistics.
- `agronautas-platform`: APIs/webhooks, ERP/accounting/import/export, billing, mobile/offline, IoT, observability, and governance.
- `agronautas-ecosystem`: partner referrals, evidence packs, licensed credit/insurance handoffs, and justified traceability.
- `agronautas-scale`: crop/province expansion, aggregated benchmarking, partner ecosystem, and monetization experiments.

### Modified Capabilities
- `runtime-evidence-foundation`: add canonical risk/job contracts and require real topology proof before enabling scheduled work; preserve typed unavailable/degraded states.
- `management-foundation`: evolve from one read-only default workspace into identity-scoped operations only after ownership is proven; retain migration compatibility.
- `planning-simulator`: add durable plans only after ownership; preserve the assumptions-only label until source-backed evidence qualifies a new capability.
- `intelligence-foundation`: add qualified providers and explanations without selecting an engine or deriving economics from risk; recommendations remain blocked until prerequisites pass.
- `institutional-expansion` and `ibera-alerta`: no requirement changes; only independently proven generic infrastructure may be reused.

## Approach and Guardrails

Use evidence-first vertical slices over ERP-first or AI/marketplace-first expansion. Each change gets its own proposal/spec/design/tasks/apply/verify cycle, additive migration, typed ports/adapters, dumb UI, idempotency, observability, rollback, and strict RED-GREEN-REFACTOR evidence. Local fixtures can prove contracts; only authorized real requests and deployed topology can prove live providers or production operations. Missing data remains unavailable/insufficient, never zero or a demo value.

## Thin SDD Change Cards

Every card is an independent future SDD change. “Buildable now” means contracts, ports, migrations, fixtures, and local behavior can be developed without claiming external readiness. “Production gate” means the slice cannot be called operational until the named external evidence exists.

### Wave 0 — P0 Trust and Runtime Foundation

#### 0.1 `agronautas-baseline-product-boundaries`
- **Outcome:** one maintained product map, status vocabulary, supported geography/crop boundary, and truthful current-state UI/API language.
- **Dependencies:** baseline `0e84707`; current specs and runtime report.
- **Buildable now:** documentation, contract inventory, capability-state matrix, route ownership map, and regression tests for no fabricated claims.
- **External gates:** none for the contract; source and runtime evidence remain separately gated.
- **Business/regulatory decisions:** target wedge, first persona, supported province/crops, advice/liability language, and evidence retention posture.
- **Acceptance evidence:** source-linked inventory agrees with code/specs; unsupported domains serialize explicit states; Iberá routes/specs remain untouched.
- **Rollback/slice boundary:** documentation/tests only; revert the change folder without data migration or runtime behavior change.
- **Non-goals:** no feature activation, engine choice, market claim, or UI rewrite.

#### 0.2 `agronautas-runtime-canonical-risk-contract`
- **Outcome:** one versioned risk/job envelope shared by TypeScript and Python, with explicit engine-selection decision status, queue states, leases, retries, DLQ, and readiness.
- **Dependencies:** baseline; existing `ComputeFieldRiskUseCase`, workflow schemas, dispatcher, readiness repository, worker consumer, and runtime spec.
- **Buildable now:** cross-runtime golden fixtures, canonical state machine, idempotency keys, telemetry, disabled-by-default scheduler, and local fake Redis/Postgres tests.
- **External gates:** compatible Python worker deployment, Redis/Postgres, Render service/cron wiring, credentials, logs, restart recovery, and an authorized real field.
- **Business/regulatory decisions:** risk owner, alert severity, freshness SLO, agronomist review, automatic-task policy, and liability boundary. Do not select the risk engine until this decision is approved.
- **Acceptance evidence:** identical fixtures produce identical contract output; local tests cover lease/retry/DLQ; a separate authorized run proves API→Redis→worker→Postgres, cron ownership, completion/recovery, and `productionProven` only when all are observed.
- **Rollback/slice boundary:** contract-version adapter and feature flag permit old snapshot reads; scheduler stays disabled and no existing evidence is rewritten.
- **Non-goals:** model accuracy claim, autonomous recommendation, or production readiness from tests alone.

#### 0.3 `agronautas-identity-workspace-ownership`
- **Outcome:** authenticated actor, organization/workspace membership, field ownership, delegated access, and server-side authorization replace the default-workspace backdoor for private data.
- **Dependencies:** baseline; runtime request IDs; additive Prisma migration; existing role middleware and BFF.
- **Buildable now:** actor context ports, membership/ownership schema, policy tests, migration/backfill mapping legacy fields to an explicitly transitional owner, and forbidden-state UI.
- **External gates:** selected identity provider, production secrets, email/invitation delivery, session/token policy, DPA, and authenticated real-field smoke.
- **Business/regulatory decisions:** legal entity model, advisor cross-workspace access, invitations, role inheritance, ownership transfer, export/delete, consent, and audit retention.
- **Acceptance evidence:** actor/tenant context is mandatory for private routes; cross-tenant access is denied; role changes and ownership changes are auditable; anonymous/demo access cannot read private fields; real authenticated field smoke passes.
- **Rollback/slice boundary:** additive membership tables and compatibility read path; disable private mutations while preserving read-only legacy behavior, with no deletion of field evidence.
- **Non-goals:** billing, SSO breadth, public API keys, or claiming customer tenancy before provider smoke.

#### 0.4 `agronautas-evidence-ledger-foundation`
- **Outcome:** append-only, typed observations unify provider signals, soil, satellite, prices, yield, invoices, notes, photos, and reports without losing lineage.
- **Dependencies:** identity for ownership; current `EvidenceEnvelope`, `SignalIngestionRun`, source registry, and runtime contract.
- **Buildable now:** additive observation tables/ports, source/subject/value/unit/currency/time/quality/review/supersession contracts, repository transactions, and local fixtures.
- **External gates:** source API terms, commercial use, attribution, retention rights, object storage, and customer permission for uploaded evidence.
- **Business/regulatory decisions:** accepted evidence authority, corrections, review roles, legal status of photos/invoices/notes, retention, redaction, and deletion.
- **Acceptance evidence:** UI value traces to observation and run; stale/latest-good behavior preserves age and lineage; corrections append a version; unavailable states carry no usable value; tenant isolation is proven.
- **Rollback/slice boundary:** dual-read/append-only new tables; disable ledger consumers and retain old snapshots, with reversible additive migration.
- **Non-goals:** retroactively declaring fixtures live, mutable history, or automatic evidence truth.

#### 0.5 `agronautas-runtime-observability-slos`
- **Outcome:** operational truth for API, worker, queue, cron, providers, reports, and notifications with bounded SLO/error taxonomies.
- **Dependencies:** canonical runtime and evidence ledger; existing telemetry/health endpoints.
- **Buildable now:** correlation IDs, dashboards/log fields, health semantics, runbooks, replay/DLQ tools, local fault injection, and SLO contracts.
- **External gates:** production logs/metrics, Render ownership, alerting credentials, on-call owner, and real incident/restart tests.
- **Business/regulatory decisions:** RPO/RTO, freshness per signal, retry budget, incident severity, support SLA, and stale-action policy.
- **Acceptance evidence:** local fault suites plus separate deployed proof of queue transition, worker heartbeat, cron lock, provider latency/status, restart recovery, and alert delivery.
- **Rollback/slice boundary:** additive telemetry and dashboard flags; remove consumers without changing domain records.
- **Non-goals:** claiming availability/SLA, enabling cron, or replacing product acceptance with dashboards.

### Wave 1 — P1 Field Operating System (after the P0 geometry gate)

#### 1.1 `agronautas-field-registry-geometry-governance`
- **Outcome:** farm/property → field → subfield/zone master data with versioned geometry, operator editing/import, review state, and authoritative server metrics.
- **Priority/sequence:** P0 trust gate delivered immediately after identity/evidence foundations; its field-operating extensions then unlock Wave 1.
- **Dependencies:** identity/ownership and evidence ledger; current PostGIS/WKT/GeoJSON ports and geometry editor.
- **Buildable now:** hierarchy, archive/version history, self-intersection/area QA, provider-neutral map port, WKT/GeoJSON import/export, point-only states, and conflict tests.
- **External gates:** Google Maps/geocoding billing/key restrictions; IGN/IDERA/cadastral/official datasets, licenses, attribution, and verified coverage.
- **Business/regulatory decisions:** authoritative boundary, accuracy tolerance, lease/tenure semantics, agronomist sign-off, and whether geometry can drive alerts/insurance/compliance.
- **Acceptance evidence:** tenant-scoped CRUD, deterministic conflict handling, server area metrics, source/version/status on every map/export, and no “official” label for fallback geometry.
- **Rollback/slice boundary:** preserve current centroid/polygon fields; new hierarchy and review tables can be disabled without rewriting evidence.
- **Non-goals:** cadastral certification, routing, or geometry-derived regulated decisions.

#### 1.2 `agronautas-campaign-season-plan-drafts`
- **Outcome:** durable seasons/campaigns, crop history, planting intentions, field/zone membership, versioned plans, and draft/approved/archived lifecycle.
- **Dependencies:** identity, field registry, evidence ledger, audit, and the current non-persistent planning contract.
- **Buildable now:** additive models, deterministic versioning, assumptions/facts separation, plan validation, and accessible draft UI.
- **External gates:** none for user-owned drafts; weather/soil/yield/price sources are gated when treated as facts.
- **Business/regulatory decisions:** season convention, crop-history authority, plan approver, record versus recommendation semantics, and retention.
- **Acceptance evidence:** authorized tenant creates/revises/archives a plan; versions reproduce; source evidence is immutable; missing inputs stay insufficient; approval is auditable.
- **Rollback/slice boundary:** retain non-persistent simulator and hide durable plans behind a flag; additive campaign tables are isolated.
- **Non-goals:** forecast, profitability, agronomic recommendation, or cross-tenant crop benchmarking.

#### 1.3 `agronautas-management-tasks-decisions-audit`
- **Outcome:** repeatable operations with teams, roles, assignments, tasks, checklists, approvals, decisions, and an append-only actor audit trail.
- **Dependencies:** identity, field/campaign models, evidence ledger, runtime observability.
- **Buildable now:** narrow task/decision/approval state machines, actor/time/reason/evidence references, separation-of-duties policies, and local UI.
- **External gates:** professional sign-off/e-signature provider only if legally required; notification delivery is gated separately.
- **Business/regulatory decisions:** delegation, separation of duties, signature authority, professional liability, retention, and meaning of “verified complete.”
- **Acceptance evidence:** unauthorized assignment/approval is rejected; transitions are append-only; audit export reconstructs decisions independently of Redis logs; replay is idempotent.
- **Rollback/slice boundary:** start with plan/operation approval; disable new mutations while retaining immutable audit records and existing read projections.
- **Non-goals:** generic workflow engine, payroll, HR, or autonomous task execution.

#### 1.4 `agronautas-visits-notes-attachments`
- **Outcome:** field visits, observations, notes, photos, documents, and attachments linked to field/zone/campaign and evidence lineage.
- **Dependencies:** identity, field registry, evidence ledger, object-storage abstraction, audit.
- **Buildable now:** metadata, upload contract, typed note/visit states, draft/review workflow, size/type limits, and local storage adapter tests.
- **External gates:** object storage, virus scanning, device capture permissions, retention/DPA, and customer consent.
- **Business/regulatory decisions:** who may author/verify notes, whether photos are evidence or working material, redaction, legal hold, and deletion.
- **Acceptance evidence:** tenant authorization, bounded uploads, immutable version links, visible author/time/status, failed upload recovery, and deletion/retention behavior.
- **Rollback/slice boundary:** metadata-only notes first; disable uploads without losing text or existing reports.
- **Non-goals:** certified agronomic records, e-signature, or automatic diagnosis from images.

#### 1.5 `agronautas-alert-notification-inbox`
- **Outcome:** actionable in-app alert inbox with subscriptions, deduplication, acknowledgement, escalation ownership, delivery state, and optional task handoff.
- **Dependencies:** canonical risk/alerts, identity/roles, tasks/audit, durable worker, observability.
- **Buildable now:** in-app persistence, idempotency, stale/degraded rendering, acknowledgement semantics, retry/DLQ tests, and no-external-delivery mode.
- **External gates:** email/SMS/push credentials, consent/anti-spam controls, delivery provider terms, and production worker proof.
- **Business/regulatory decisions:** severity, quiet hours, escalation, emergency disclaimer, acknowledgement meaning, and retention.
- **Acceptance evidence:** one alert has deterministic event ID, tenant/user status, retry/DLQ, visible stale state, and trigger→acknowledgement audit; external delivery is separately proven.
- **Rollback/slice boundary:** in-app only first; disable outbound channels without losing snapshots or acknowledgements.
- **Non-goals:** emergency authority, guaranteed notification, or alert-driven autonomous operations.

#### 1.6 `agronautas-pilot-evidence-reporting`
- **Outcome:** reproducible field evidence report, timeline, CSV/JSON/PDF export, and measured pilot workflow around inspect evidence → understand risk → record decision/task.
- **Dependencies:** identity, ledger, field/campaign/operations, canonical risk contract, observability.
- **Buildable now:** deterministic report renderer, export schemas, source/freshness/engine metadata, access-controlled downloads, and usability instrumentation.
- **External gates:** production data, sharing/storage, customer pilot consent, and support owner.
- **Business/regulatory decisions:** report purpose, redaction, retention, legal hold, pilot persona, wedge, and measurable comprehension/task-success criteria.
- **Acceptance evidence:** same snapshot regenerates same content; export is authorized and lineage-complete; pilot user repeats workflow without engineering intervention and distinguishes observed/inferred/unavailable states.
- **Rollback/slice boundary:** add reports beside current dashboard PDF; remove new templates without altering snapshots.
- **Non-goals:** certified agronomic, cadastral, financial, insurance, or regulatory documents; ROI or market-success claims.

### Wave 2 — P1 Intelligence and P2 Economics

#### 2.1 `agronautas-verified-provider-qualification`
- **Outcome:** source registry and one qualified source vertical at a time for Georef, weather, soil, satellite, fire, and remote sensing evidence.
- **Dependencies:** evidence ledger, field geometry, runtime/worker proof, provider matrix, and risk contract.
- **Buildable now:** typed adapters, parser/schema tests, source qualification checklist, freshness calculators, provider modes, fixture/seam lanes, and Georef/Open-Meteo bounded integration harness.
- **External gates:** Georef/IGN/INTA/SMN/Open-Meteo/NASA POWER/FIRMS/Copernicus/STAC access, keys, commercial terms, attribution, rate limits, coverage, and retention rights. No provider is “live” from a fixture.
- **Business/regulatory decisions:** acceptable modeled/reanalysis use, agronomic validation, spatial/revisit/cloud thresholds, fire-alert responsibility, and source authority.
- **Acceptance evidence:** each real run records URL, provider mode, units, observation/retrieval/forecast semantics, schema/HTTP outcome, latency, run ID, raw lineage, and freshness; sentinel/missing data is unavailable/degraded.
- **Rollback/slice boundary:** qualify weather first; each provider adapter can be disabled independently while latest accepted evidence remains visible.
- **Non-goals:** claiming soil/satellite/fire coverage, official geometry, or recommendations before qualification.

#### 2.2 `agronautas-risk-explanation-and-recommendation-gates`
- **Outcome:** explainable risk drivers, versioned rule/model registry, calibration evidence, uncertainty, human review, and explicit recommendation blockers.
- **Dependencies:** runtime canonical contract, qualified sources, evidence ledger, field/crop history, tasks/approvals, and pilot feedback.
- **Buildable now:** engine-neutral output contract, driver citations, golden fixtures, uncertainty/degradation rules, review queue, and deterministic explanation UI.
- **External gates:** validated agronomic datasets, local calibration, qualified agronomists, model/provider licenses, real operations, and any professional-advice review.
- **Business/regulatory decisions:** canonical engine selection (still `undecided` until approved), risk owner, severity, liability, automatic-task policy, and recommendation approval.
- **Acceptance evidence:** same inputs are reproducible cross-runtime; every driver cites evidence/version; stale/missing evidence lowers confidence or blocks action; recommendation lists all missing prerequisites and never invents a crop/price/profit.
- **Rollback/slice boundary:** explanations can ship without recommendations; preserve both engine identities and `undecided` selection until decision record and calibration pass.
- **Non-goals:** yield guarantee, profitability, insurance risk, licensed advice, or autonomous mutation.

#### 2.3 `agronautas-campaign-planning-scenarios`
- **Outcome:** versioned calendars, constraints, assumptions, sensitivity analysis, and comparison of planting/operational scenarios.
- **Dependencies:** durable campaigns, operations, qualified evidence, risk explanation, and audit.
- **Buildable now:** deterministic scenario math, explicit fact/assumption/output types, scenario versions, comparison UI, and accessible unavailable states.
- **External gates:** source-backed weather/soil/yield/price data and customer adoption evidence when scenarios are presented as operational forecasts.
- **Business/regulatory decisions:** forecast versus simulation wording, approval authority, time horizon, constraint policy, and accountability for chosen plan.
- **Acceptance evidence:** reruns are deterministic; assumptions are visible; stale inputs degrade results; selected scenario is auditable and never mutates source observations.
- **Rollback/slice boundary:** retain assumptions-only mode and hide source-backed claims if a provider is withdrawn.
- **Non-goals:** automated crop choice, financial return guarantee, or risk-engine selection.

#### 2.4 `agronautas-economic-observation-budget-cashflow`
- **Outcome:** source-backed prices/FX/costs/yield, unit/currency/freshness-qualified observations, budgets, cash flow, and audited scenarios.
- **Dependencies:** identity, ledger, campaigns/operations, reports, risk gates, and governance.
- **Buildable now:** monetary observation schema, user-owned cost templates, arithmetic, budget drafts, reconciliation, sensitivity tables, and missing-input states.
- **External gates:** verified commodity/price feeds, BCRA/FX source or approved equivalent, taxes/finance rules, invoices, accounting data, and licenses.
- **Business/regulatory decisions:** currency/base date, authority/source hierarchy, conversion/tax treatment, credit terms, profitability definition, and disclaimer/liability.
- **Acceptance evidence:** every value has source, unit, currency, observed/retrieved time, lineage, and freshness; budgets reconcile; missing evidence is not zero; same scenario reruns identically; no fabricated profitability.
- **Rollback/slice boundary:** user assumptions and templates first; disable external feeds without deleting user-owned drafts or prior observations.
- **Non-goals:** financial advice, credit scoring, guaranteed yield/margin, or deriving economics from risk.

#### 2.5 `agronautas-procurement-requisition-and-logistics`
- **Outcome:** private requisitions, quotes, approval, inventory need, shipment/delivery status, and source-backed units/currency.
- **Dependencies:** identity, operations/approvals, economics, documents, notifications, observability.
- **Buildable now:** private request/quote state machine, owner/approval/audit, supplier records entered by the tenant, and no-payment local flow.
- **External gates:** supplier/product data, logistics/routing, payment/tax invoicing, fulfillment partners, and commodity-handling requirements.
- **Business/regulatory decisions:** platform versus agent role, KYC/KYB, commissions, moderation, disputes, delivery terms, and jurisdiction.
- **Acceptance evidence:** request has owner, approval, quote provenance, status, and recovery path; no field data becomes a public listing; failed fulfillment is visible and replay-safe.
- **Rollback/slice boundary:** private requisition only; remove quote/payment adapters without changing campaign or budget records.
- **Non-goals:** public marketplace, price guarantee, payment capture, custody, or commodity transaction.

### Wave 3 — P2 Platform

#### 3.1 `agronautas-private-api-webhooks`
- **Outcome:** versioned, tenant-scoped read API and signed webhook subscriptions for one private integration beta.
- **Dependencies:** identity, stable internal contracts, entitlements, audit, observability, durable worker, and connector registry.
- **Buildable now:** API catalog, versioned errors, idempotency, correlation tracing, quotas, signature/replay tests, and read-only adapter.
- **External gates:** gateway/key management, partner credentials, webhook delivery, support/SLA, and data-processing agreements.
- **Business/regulatory decisions:** export rights, quotas, version support, liability, event semantics, retention, and consent.
- **Acceptance evidence:** contract tests cover auth/version/error/idempotency; quotas and signatures are tenant-scoped; replay is safe; provider/worker failure is observable.
- **Rollback/slice boundary:** private read beta with feature flag; revoke subscriptions and retain internal routes.
- **Non-goals:** public/open API, write-back, or partner access before ownership and entitlements.

#### 3.2 `agronautas-erp-accounting-import-export`
- **Outcome:** one validated CSV or agreed ERP/accounting connector with mappings, cursors, provenance, and safe import/export.
- **Dependencies:** ledger, operations/economics, private API, identity, worker, and observability.
- **Buildable now:** connector ports, mapping/version contracts, idempotent import, dry-run/export, sync cursor, and conflict report.
- **External gates:** vendor API/account, secrets, accounting authority, tax schema, data license, and customer authorization.
- **Business/regulatory decisions:** system of record, write-back authority, conflict resolution, correction ownership, and support model.
- **Acceptance evidence:** replay-safe tenant-scoped runs expose source/version/cursor/failure and never silently overwrite agronomic/economic facts.
- **Rollback/slice boundary:** read-only CSV/export first; disable connector/write-back while preserving imported lineage.
- **Non-goals:** all-ERP coverage, autonomous reconciliation, or accounting certification.

#### 3.3 `agronautas-iot-sensors`
- **Outcome:** sensor/device registry and qualified telemetry observations linked to zones, with calibration and outage states.
- **Dependencies:** field registry, evidence ledger, connector/runtime platform, identity, observability.
- **Buildable now:** device/metric/unit schema, synthetic fixtures, ingestion idempotency, calibration metadata, and no-data UI states.
- **External gates:** hardware/vendor APIs, device certificates, network, calibration service, installation, and data rights.
- **Business/regulatory decisions:** sensor authority, calibration responsibility, acceptable lag, replacement policy, and whether telemetry can trigger tasks/alerts.
- **Acceptance evidence:** tenant-scoped replay-safe ingestion preserves device/source/time/unit/calibration; outages are degraded; no sensor value overwrites other evidence silently.
- **Rollback/slice boundary:** one read-only device family; disable ingest without deleting prior observations.
- **Non-goals:** hardware sales, safety-critical control, or automatic agronomic action.

#### 3.4 `agronautas-mobile-offline-field-capture`
- **Outcome:** mobile web/PWA or native field capture with read cache, draft notes/photos, sync status, retry, and human-visible conflicts.
- **Dependencies:** identity, visits/attachments, ledger, audit, worker/sync, notifications, and field geometry.
- **Buildable now:** draft-only local store, schema/versioning, offline/online state matrix, idempotent replay simulation, and conflict UI.
- **External gates:** device permissions, GPS/maps, camera/storage, push service, encryption/key management, mobile distribution, and field pilot.
- **Business/regulatory decisions:** offline data sensitivity, device loss, cache retention, conflict authority, and legal meaning of offline records.
- **Acceptance evidence:** drafts never masquerade as facts; replay is idempotent; conflicts surface to a human; sensitive cache clears per policy; real-device pilot is separate.
- **Rollback/slice boundary:** offline read cache and drafts first; defer offline task/approval writes.
- **Non-goals:** native app commitment, guaranteed GPS, or legally binding offline approvals.

#### 3.5 `agronautas-billing-plans-entitlements`
- **Outcome:** tenant plans, server-enforced entitlements, quotas for fields/runs/exports/seats/copilot, and cancellation behavior.
- **Dependencies:** identity/tenant account, API limits, reports, notifications, observability, and measured pilot demand.
- **Buildable now:** plan matrix, entitlement port, usage counters, deterministic denial states, and webhook replay tests without charging.
- **External gates:** payment processor, tax/invoicing provider, subscription webhooks, secrets, and legal terms.
- **Business/regulatory decisions:** buyer, pricing unit (seat/hectare/usage), trial/refund/overage, regional currency/tax, support SLA, and post-cancellation retention.
- **Acceptance evidence:** server-side checks cannot be bypassed by UI; webhook replay is idempotent; expired plans behave deterministically; retention is honored.
- **Rollback/slice boundary:** entitlement checks and internal test plans first; disable billing webhooks/charges without deleting customer data.
- **Non-goals:** claiming willingness-to-pay, charging before demand evidence, or hiding access only in UI.

#### 3.6 `agronautas-governance-privacy-retention-consent`
- **Outcome:** data classification, consent ledger, retention/deletion/export workflow, model/source registry, incident controls, and support evidence.
- **Dependencies:** identity, audit, ledger, attachments, AI, billing, APIs, and partner flows.
- **Buildable now:** policy contracts, access audits, export/delete requests, bounded retention jobs, model/source inventory, and runbooks.
- **External gates:** legal counsel, DPA/terms, provider licenses, e-signature, residency/security tooling, and approved production controls.
- **Business/regulatory decisions:** jurisdictions, personal/financial/agronomic classification, professional advice, AI training opt-out, breach notices, retention/legal hold, and partner responsibility.
- **Acceptance evidence:** access/export/delete is traceable; retention batches are bounded and tested; approved controls back every compliance statement; no UI badge substitutes for legal evidence.
- **Rollback/slice boundary:** audit/report-only controls first; pause destructive retention while preserving request history.
- **Non-goals:** certification, legal advice, or asserting compliance solely from implementation.

### Wave 4 — P3 Ecosystem and Regulated Handoffs

#### 4.1 `agronautas-partner-referrals`
- **Outcome:** consented, attributable referrals to agronomists, suppliers, lenders, insurers, or service partners without exposing private fields by default.
- **Dependencies:** identity, consent/governance, reports, API/entitlements, support, and validated pilot demand.
- **Buildable now:** referral intent, scoped data pack selection, partner directory metadata, status, and audit without automated decisioning.
- **External gates:** partner agreements, licensing, KYC/KYB, data-processing terms, referral disclosures, and operational support.
- **Business/regulatory decisions:** referral versus agent role, commission disclosure, partner responsibility, consent withdrawal, and complaint handling.
- **Acceptance evidence:** explicit consent and scope are recorded; recipient and version are immutable; revoke/retry is visible; no partner receives data without authorization.
- **Rollback/slice boundary:** referral metadata and manual handoff only; disable partner delivery while retaining consent/audit.
- **Non-goals:** endorsement, underwriting, brokerage, or guaranteed service outcome.

#### 4.2 `agronautas-review-packets-credit-insurance`
- **Outcome:** authorized lender/insurer evidence packs containing field, geometry, source lineage, risk explanation, and explicit non-decision status.
- **Dependencies:** identity/consent, canonical risk decision, ledger, reports, audit, governance, and partner contract.
- **Buildable now:** deterministic, redacted export with pack version, recipient, consent, source times, and human-review handoff.
- **External gates:** licensed financial/insurance partners, approved data sharing, KYC/KYB, underwriting data, policy terms, and regulatory/legal review.
- **Business/regulatory decisions:** licensed role, adverse-action notices, explainability, model governance, retention, and claims authority.
- **Acceptance evidence:** exports are consented/scoped/versioned/immutable; UI says review support only; no approval, premium, payout, coverage, or eligibility is emitted.
- **Rollback/slice boundary:** export-only; revoke partner integration without changing source observations.
- **Non-goals:** credit score, premium, underwriting, coverage confirmation, payout, or claim decision.

#### 4.3 `agronautas-claims-human-review`
- **Outcome:** only if a real licensed partner requires it, a claim intake/evidence chain/adjuster handoff with human authority.
- **Dependencies:** partner pack, governance, attachments, audit, identity/consent, and documented partner workflow.
- **Buildable now:** domain contract and redacted test fixtures; no regulated outcome.
- **External gates:** licensed partner, policy/claim terms, adjuster authority, secure evidence exchange, jurisdictional review, and production incident/support process.
- **Business/regulatory decisions:** claims authority, dispute/appeal, adverse action, retention, fraud handling, and liability.
- **Acceptance evidence:** human reviewer and decision provenance are recorded; automated system never emits indemnity/coverage/payout; partner acceptance is separately documented.
- **Rollback/slice boundary:** intake/handoff only; disable claim integration without deleting source evidence.
- **Non-goals:** automated claims, parametric triggers, or insurer replacement.

#### 4.4 `agronautas-marketplace-listings-transactions`
- **Outcome:** only after repeated private procurement demand and compliance readiness, a narrowly scoped moderated listing/quote/transaction pilot.
- **Dependencies:** procurement, economics, identity/KYB, APIs, billing, logistics, governance, and partner support.
- **Buildable now:** discovery directory and private quote requests; listing schemas can remain disabled.
- **External gates:** supplier/product verification, payment, tax, logistics, marketplace terms, moderation, regulated commodity rules, and dispute operations.
- **Business/regulatory decisions:** platform/agent role, KYC/KYB, commissions, custody, title/risk transfer, jurisdiction, refunds, and moderation.
- **Acceptance evidence:** only authorized data is listed; supplier/offer/price/units have provenance; payment/fulfillment failures recover visibly; transaction audit is complete.
- **Rollback/slice boundary:** directory/request only; transactions behind a separate feature flag and kill switch.
- **Non-goals:** open national marketplace, price guarantees, custody, or market-success claim.

#### 4.5 `agronautas-senasa-traceability-where-justified`
- **Outcome:** a justified, source-backed traceability export or workflow only where a customer and competent authority requirement make it necessary.
- **Dependencies:** field/campaign/operation/audit/evidence ledger, identity, governance, ERP/accounting connector, and partner/legal review.
- **Buildable now:** requirement discovery, event/lot/operation provenance model, and export fixture tests.
- **External gates:** SENASA requirements and identifiers, regulated operator authorization, official endpoint/schema, credentials, and customer data.
- **Business/regulatory decisions:** applicable commodity/jurisdiction, system of record, responsible declarant, retention, correction, and submission authority.
- **Acceptance evidence:** required records are complete and attributable; export validates against the approved official contract; rejected submissions remain visible; no “SENASA compliant” claim without authority evidence.
- **Rollback/slice boundary:** evidence/export draft first; do not create official submissions until the partner and endpoint are approved.
- **Non-goals:** universal traceability, regulatory certification, or automatic filings.

### Wave 5 — P4 Scale and Measured Monetization

#### 5.1 `agronautas-crop-province-expansion`
- **Outcome:** expand supported crops/provinces only through evidence, geometry, agronomic validation, and operational support gates.
- **Dependencies:** field registry, qualified providers, calibrated risk, governance, pilot evidence, and support capacity.
- **Buildable now:** capability registry, contract fixtures, localization/coverage matrices, and explicit unsupported UI states.
- **External gates:** local datasets/providers, official boundaries, agronomist validation, licenses, customer pilots, and operational coverage.
- **Business/regulatory decisions:** expansion order, minimum evidence, support SLA, terminology, and liability by crop/region.
- **Acceptance evidence:** each new crop/province has source/coverage/version tests, real bounded evidence, calibrated outputs, user acceptance, and rollback flag.
- **Rollback/slice boundary:** enable one crop/province at a time; disable it without affecting existing supported areas.
- **Non-goals:** national coverage claim or extrapolating Corrientes evidence to unsupported regions.

#### 5.2 `agronautas-benchmarking-aggregated-data-moat`
- **Outcome:** opt-in, privacy-preserving aggregated benchmarks and learning loops that improve product value without exposing customer data.
- **Dependencies:** consent/governance, identity, sufficient multi-tenant observations, quality controls, economics/intelligence, and security review.
- **Buildable now:** aggregation contracts, minimum cohort thresholds, synthetic datasets, opt-out, suppression, and query audit.
- **External gates:** legal/privacy review, customer consent, data rights, aggregation security, and enough representative data.
- **Business/regulatory decisions:** ownership of derived aggregates, opt-in/opt-out, re-identification threshold, benchmark definitions, and commercial use.
- **Acceptance evidence:** small cohorts are suppressed; output is reproducible and audited; tenant deletion/opt-out propagates; no individual farm can be inferred in tests or pilot.
- **Rollback/slice boundary:** report-only aggregate views; disable benchmark publication and delete derived caches per policy.
- **Non-goals:** selling raw customer data, training without consent, or claiming a data moat before evidence.

#### 5.3 `agronautas-partner-ecosystem-monetization`
- **Outcome:** test sustainable packaging, partner channels, and monetization against measured usage and support cost.
- **Dependencies:** pilot evidence, billing/entitlements, APIs, referrals, governance, reliability, and validated workflows.
- **Buildable now:** pricing hypotheses, entitlement experiments, referral attribution, unit economics model using observed inputs, and kill criteria.
- **External gates:** payment/tax, partner contracts, customer research, production support, and real conversion/retention data.
- **Business/regulatory decisions:** buyer, package, commissions, SLAs, refund/support obligations, partner conflicts, and success thresholds.
- **Acceptance evidence:** measured attributable usage, retention, support burden, cost-to-serve, and customer feedback; no revenue, market-size, or viability claim from assumptions.
- **Rollback/slice boundary:** experiment flags and reversible plans; disable offers/partner channel without deleting operational records.
- **Non-goals:** promise of market success, premature scale, or monetizing regulated outcomes.

## Dependency DAG

```text
0.1 baseline-boundaries
├── 0.2 runtime-canonical-risk-contract ──┬── 0.5 runtime-observability-slos
│                                        ├── 2.1 verified-provider-qualification
│                                        │   └── 2.2 risk-explanation-and-recommendation-gates
│                                        │       ├── 2.3 campaign-planning-scenarios
│                                        │       ├── 2.4 economic-observation-budget-cashflow
│                                        │       └── 4.2 credit-insurance-review-packets
│                                        └── 1.5 alert-notification-inbox
├── 0.3 identity-workspace-ownership ────┬── 1.1 field-registry-geometry-governance
│                                        │   └── 1.2 campaign-season-plan-drafts
│                                        │       └── 1.3 management-tasks-decisions-audit
│                                        │           ├── 1.4 visits-notes-attachments
│                                        │           ├── 1.5 alert-notification-inbox
│                                        │           └── 2.5 procurement-requisition-and-logistics
│                                        ├── 3.1 private-api-webhooks
│                                        ├── 3.4 mobile-offline-field-capture
│                                        └── 3.5 billing-plans-entitlements
└── 0.4 evidence-ledger-foundation ─────┬── 1.6 pilot-evidence-reporting
                                         ├── 2.1 verified-provider-qualification
                                         ├── 2.4 economic-observation-budget-cashflow
                                         └── 3.2 ERP-accounting-import-export / 3.3 IoT-sensors

2.4 economics ──> 2.5 procurement ──> 4.4 marketplace (only after demand/compliance)
1.6 pilot ──────> 3.5 billing ──────> 5.3 ecosystem-monetization
0.6 governance ──> all private, AI, partner, regulated, offline, and aggregate paths
4.1 referrals ───> 4.2 review-packets ──> 4.3 claims-human-review (only if required)
```

Iberá-Alerta is outside this DAG. It remains under hydrology-government routes, hydrology schemas/tables, government UI, its own deployment/cron/operator ownership, and its own acceptance. A shared primitive may be extracted only after identical behavior is proven in both products, with versioned contracts and independent tests; no shared risk engine, tenant model, queue ownership, notification policy, or public API is assumed.

## Release Waves and Value/Risk Prioritization

| Wave | Scope | Value | Risk if wrong | Gate |
|---|---|---:|---:|---|
| W0 / P0 | Boundaries, runtime, identity, evidence, SLOs | Very high trust/security | Critical data and false-readiness risk | Must precede private data and scheduled production work |
| W1 / P1 | Field registry, campaigns, operations, visits, alerts, reports | High repeat-use value | Ownership/audit/support complexity | Pilotable only with actor and evidence lineage |
| W2 / P1–P2 | Qualified intelligence, risk explanation, scenarios, economics | High differentiation | Highest truth/liability risk | Provider, calibration, unit/currency, and human gates |
| W3 / P2 | API, ERP, IoT, mobile, billing, governance | Medium/high distribution value | Security, sync, tax, support cost | Stable contracts plus real partner/device/payment proof |
| W4 / P3 | Referrals, packs, claims handoff, marketplace, SENASA | Conditional ecosystem value | Legal/regulated/transaction exposure | Licensed partners, consent, demand, compliance |
| W5 / P4 | Expansion, aggregate benchmarks, monetization | Strategic upside | Scale before product-market evidence | Crop/province/support/retention and unit-economics proof |

## Local-First vs Production-Gated Classification

**Local-first:** domain invariants, typed contracts, additive migrations against authorized test databases, geometry QA, actor policy tests, evidence lineage, risk fixtures, deterministic scenarios, audit transitions, entitlement decisions, provider parsers with injected fixtures, fake queue state machines, report determinism, offline replay simulations, aggregation suppression, and accessible UI state matrices. These prove behavior, not live availability.

**Production/provider-gated:** identity-provider login and deletion, private-field smoke, Google/official geometry, Georef/IGN/INTA/SMN/Open-Meteo/NASA POWER/FIRMS/Copernicus commercial use, source coverage/freshness, API→Redis→Python worker→Postgres completion, cron ownership, Render wiring/restart recovery, email/SMS/push, LLM credentials, market/FX/yield feeds, ERP/IoT/payment, mobile device permissions, licensed referrals/credit/insurance/claims, SENASA endpoints, customer pilot acceptance, pricing, retention, and any compliance or market claim.

## Concrete User Inputs Needed

1. Choose the initial buyer/user wedge: producer, agronomist/advisor, operations manager, lender/insurer reviewer, or another persona; name the first workflow and success measure.
2. Confirm initial legal entity, tenancy, advisor delegation, invitations, ownership transfer, consent, export/delete, and retention rules.
3. Select first supported province/crops and authoritative field/geometry sources; provide any customer-owned field records and permission to use them.
4. Decide risk accountability: acceptable engine decision process, agronomist reviewer, severity/freshness policy, liability wording, and whether recommendations may draft tasks.
5. Approve provider usage: Georef/IGN/INTA/SMN/Open-Meteo/NASA POWER/FIRMS/Copernicus sources, credentials, commercial/licensing/attribution rights, coverage, and retention.
6. Provide authorized runtime access or named owners for PostgreSQL, Redis, Python worker, Render services/cron/logs, and one verified real field for bounded acceptance; otherwise keep readiness unproven.
7. Provide source-backed economics: price/FX/yield/cost/accounting authorities, units/currencies/tax rules, and whether user assumptions are sufficient for the first pilot.
8. Identify the first ERP/accounting, sensor, map, payment, notification, storage, and identity providers, including sandbox/production credentials and support owners.
9. State whether mobile/offline records can be legally meaningful and the device/cache/security policy.
10. Name licensed lender/insurer/SENASA/marketplace partners, the precise requested handoff, jurisdiction, consent, and compliance owner; do not authorize regulated features without this input.
11. Define pilot volume, support capacity, pricing hypothesis, cancellation/retention expectations, and the evidence required before expansion or monetization.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Default workspace becomes a tenant bypass | High | Identity/ownership before private data; deny cross-tenant access; audit policy tests. |
| Two runtimes diverge or engine choice is premature | High | Versioned engine-neutral contract, golden fixtures, explicit `undecided` decision gate. |
| Tests or planned jobs are mistaken for live runtime | High | Separate local/production evidence; scheduler disabled until queue/worker/cron/Render proof. |
| Provider access is mistaken for license, coverage, or freshness | High | Source qualification registry, real run metadata, explicit unavailable/degraded states. |
| Missing soil/economic data contaminates advice | High | Independent capability states, no zero/default substitution, recommendation blockers. |
| Operations become legally meaningful without authority | Medium | Actor/approval/audit/consent semantics before offline, partner, financial, or regulated workflows. |
| Marketplace/platform scope overwhelms the wedge | High | Private requisitions and one connector first; demand and compliance gates before transactions. |
| Shared code accidentally merges Iberá ownership | Medium | Separate route/schema/storage/terms/ops; reuse only proven versioned primitives with independent tests. |
| AI amplifies unsupported claims | Medium | Evidence citations, uncertainty, prompt/output audit, confirmation for mutations, and human review. |

## Rollback and Delivery Policy

Each slice MUST use additive migrations, feature flags or capability states, dual-read/compatibility adapters where needed, idempotent backfills, bounded reversible retention, and an explicit kill switch for provider/worker/partner integrations. Rollback must disable the new consumer or external side effect first, preserve existing snapshots/observations, and never rewrite provenance to make a failed run look successful. Future tasks should be one reviewable SDD slice with RED-GREEN-REFACTOR evidence; if a slice exceeds the repository’s review budget, split it by the boundaries above rather than combine unrelated domains.

## Success Criteria

- [ ] Agronautas can truthfully distinguish actor-owned data, observed evidence, assumptions, inferred risk, recommendations, drafts, unavailable states, and production proof.
- [ ] The first pilot workflow is repeatable by an authorized user, auditable, evidence-linked, and useful without unsupported economics or advice.
- [ ] Every provider, worker, cron, partner, payment, mobile, and regulated claim has the corresponding credential/license/data/runtime evidence—or remains explicitly unavailable.
- [ ] The risk engine remains `undecided` until the named business, agronomic, calibration, and runtime decision gate passes; no implementation assumes a premature winner.
- [ ] Iberá-Alerta remains behaviorally and operationally separate; only proven shared primitives are reused.
- [ ] Expansion and monetization decisions are based on measured usage, comprehension, reliability, support burden, and attributable outcomes—not roadmap text or demo metrics.

## Proposal question round

This autonomous run does not pause for answers. Before any downstream specs, the owner should review the concrete inputs above—especially the initial wedge, tenancy/ownership model, risk accountability, provider/runtime access, and regulated-partner boundaries—and correct assumptions that would change sequencing. The proposal intentionally leaves engine choice, market success, compliance, and production readiness undecided until evidence and accountable decisions exist.
