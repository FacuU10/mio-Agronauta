## Exploration: agronautas-campaign-planning-simulators

### Current State

The repository is a pnpm/Turborepo monorepo at `main` commit `f585af7`. Agronautas currently has a real field-centered evidence workflow, not a campaign-planning system. A field can be created and listed, with crop, hectares, locality, coordinates, optional PostGIS geometry, field context, climate ingestion, risk snapshots, alerts, timelines, provenance, freshness, recompute jobs, PDF text output, and bounded grounded chat.

The strongest executable source is the Open-Meteo climate path. Risk calculation combines climate, optional satellite summaries, and field context, but the two represented risk engines remain divergent and the canonical engine selection is explicitly undecided. Existing contracts already model unavailable/degraded/stale evidence and provider modes (`live`, `seam`, `mock`, `unavailable`).

The requested planning and commercial domains are not executable today:

- No workspace/tenant/ownership model exists. Auth exposes global Agronautas scopes, not user identity, membership, or ownership.
- No campaign, campaign-field membership, calendar activity, resource, budget, cost, yield baseline, or durable planning decision model exists.
- No soil, crop-history, yield, price, FX, commodity, export, marketplace, credit, or insurance provider/storage/UI path is proven.
- The web `FutureCapabilities` component intentionally presents prices/trends, recommendations, export marketplace, workspace expansion, and simulations as pending contracts.
- Strategic roadmap material places management before economic intelligence, economic intelligence before campaign simulators, and market/finance capabilities after trust, data, and policy are established. These documents are intent, not implementation evidence.

Therefore the change is a multi-stage product area, not one implementable feature. The first safe increment should expose a typed evidence/capability boundary and reuse existing field, climate, risk, freshness, and provenance data without deriving economic values from them.

### Affected Areas

- `apps/api/src/domain/entities/agronautas.ts` — existing `Field`, climate, signal, risk, freshness, degradation, and evidence vocabulary; no campaign or economic entities.
- `apps/api/src/domain/repositories/agronautas.ts` — existing field/context/signal/risk/alert/job ports; new campaign/planning/economic ports must not overload signal repositories.
- `apps/api/src/presentation/routes/agronautas.ts` — existing field, dashboard, risk, weather, geometry, report, and chat routes; no planning, market, simulator, credit, or insurance routes.
- `apps/api/prisma/schema.prisma` — persistence currently covers fields, field contexts, signal runs, risk/alert snapshots, copilot references, and jobs; no workspace, campaign, calendar, resource, cost, market, or finance tables.
- `apps/api/src/infrastructure/adapters/agronautas-provider-adapters.ts` and `apps/api/src/infrastructure/jobs/agronautas-signal-ingestion-job.ts` — reusable provider/freshness seams, but only Open-Meteo is proven live and no economic providers are present.
- `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` — real climate worker path; no campaign or economic ingestion/calculation path.
- `packages/zod-schemas/src/agronautas.ts` and `packages/contracts/schemas/agronautas-contracts.v1.schema.json` — shared contract boundary for additive capability/evidence states; no planning or economic schema exists.
- `packages/contracts/risk-engine/golden-vectors.json` — preserves the unresolved risk-engine decision; simulators must reference risk evidence without silently selecting an engine.
- `apps/web/src/lib/agronautas/service.ts`, `apps/web/src/lib/agronautas/schemas.ts`, and `apps/web/src/components/agronautas/workspace.tsx` — current server-backed dashboard UI/service seam; suitable for a read-only planning-status surface and explicit unavailable states.
- `apps/web/src/components/visibility/future-capabilities.tsx` — current honest pending-capability pattern; it should not be converted into claims of available market or financial functionality without contracts and data.
- `docs/agronautas-roadmap-big-picture.md` and `docs/agronautas-contexto-mvp-piloto-comercial.md` — strategic sequencing and product boundaries, including no automated agronomic, credit, insurance, or financial certainty.

### Candidate Slices and Availability Boundaries

The following classification separates source-independent work from work that would fabricate external evidence.

#### Buildable without external sources, after contracts are approved

1. **Evidence and capability availability surface** — A typed read model can report, per domain, `available`, `unavailable`, `degraded`, or `insufficient_evidence`, with missing inputs, source mode, freshness, and next dependency. It can reuse the existing field/climate/risk/provenance payload and render in the current Agronautas workspace. It must contain no placeholder price, yield, cost, market, credit, or insurance values.

2. **Field-to-planning context read model** — A read-only view can show field identity, crop, hectares, geometry status, current climate evidence, risk evidence, and the explicit absence of campaign/planning data. This is useful for scoping a future campaign without asserting a workspace or ownership model.

3. **Assumptions-only scenario calculator** — After an explicit input contract is approved, a pure deterministic calculator could operate only on user-supplied assumptions (for example area, expected yield, price, FX, variable costs, fixed costs, and selected scenario labels). Its output must be labelled `user_assumption_simulation`, not forecast or recommendation, and must return `insufficient_evidence` when required inputs are absent. This does not require live market sources, but it does require domain decisions about units, currency, precision, and what “rentability” means.

4. **Manual planning shell** — Calendar/resource/cost entry screens could be built around explicitly user-authored planning inputs, with no external source dependency. They are not yet safe to persist because workspace ownership, campaign lifecycle, actor identity, resource semantics, and audit rules are undefined. Until those are specified, only a non-persistent or explicit unavailable-state surface is defensible.

#### Only unavailable-state contracts are safe while sources or policies are absent

- Soil, crop history, expected yield, observed production baselines, price series, dollar/FX, commodities, market trends, export opportunities, marketplace supply/demand, credit eligibility, insurance coverage, and claims/sinister evidence.
- Climate/economic scenario outputs that imply historical calibration or live price/FX evidence.
- Profitability, margin, return, or risk/rentability conclusions that use inferred or demo values.
- Agronomic, commercial, credit, or insurance recommendations presented as decisions or approvals.

For these domains, the contract should identify the capability, required evidence, current state, unavailable reason, source/provider mode, observed-at/freshness fields when applicable, and the boundary between facts, calculations, assumptions, and recommendations. `unavailable` means no source/path exists; `insufficient_evidence` means a calculation was requested but required inputs are missing; `degraded` means a result exists with explicit reduced quality. These states must be visible in API and UI, not represented by empty charts or zero values.

### Dependency DAG

```text
G0 Existing field + climate/risk/evidence foundation (complete, bounded)
  |
  +--> G1 Agronautas workspace/field scope and ownership boundary
          |
          +--> G2 Campaign aggregate, field membership, lifecycle, and audit semantics
          |       |
          |       +--> G3 Campaign calendar and activity constraints
          |       |
          |       +--> G4 Resource planning and manually authored cost/budget inputs
          |                   |
          |                   +--> G6 Assumptions-only scenario contract/calculator
          |                               |
          |                               +--> G7 Risk/rentability simulator with explicit assumptions
          |
          +--> G5 External evidence policy and observation contracts
                  (soil, yield, price, FX, climate history; provider selection deferred)
                          |
                          +--> G6 optional source-backed scenario inputs
                          |
                          +--> G8 Market/commodities read intelligence
                                      |
                                      +--> G9 Export opportunity and marketplace discovery

G2 + G5 + G7 + authorized provider/legal policies --> G10 Credit/insurance evidence pack and coverage scenarios
```

The graph is deliberately not a promise that every node belongs in this change. It shows the smallest credible order and the gates that prevent accidental coupling:

- `G1` precedes durable campaigns because current auth cannot prove ownership.
- `G2` precedes calendars, resources, costs, and saved scenarios because they need a campaign identity, scope, lifecycle, and history.
- `G4` can begin with manual inputs and no external providers; it must not imply observed costs.
- `G5` can define source/evidence contracts in parallel, but provider activation, cadence, units, currency, and historical coverage remain deferred until verified.
- `G6` should start as assumptions-only and add source-backed inputs only as optional evidence adapters become real.
- `G7` must remain separate from the operational risk engine and preserve its `undecided` canonical-selection status.
- `G8` and `G9` require market source policy; marketplace additionally requires participant identity, offer semantics, moderation, terms, and availability, so it is not just a dashboard extension.
- `G10` is last and conditional: it may assemble explainable evidence for human review, but must not make credit, underwriting, coverage, or indemnity decisions.

### Approaches

1. **Evidence-first planning boundary** — Add a versioned availability/read model and a planning-context surface that reuses existing field, climate, risk, freshness, and provenance evidence. Keep all absent domains explicitly unavailable and define the assumptions-only simulator as a later, separately gated slice.
   - Pros: smallest source-backed increment; useful UI now; no fabricated values; preserves product separation and current degradation conventions.
   - Cons: does not yet persist campaigns or calculate profitability; requires later decisions for ownership, units, and lifecycle.
   - Effort: Low to Medium.

2. **Management-to-simulator vertical slices** — Establish workspace/field scope, then implement campaign lifecycle, manual calendar/resources/costs, and an assumptions-only simulator in separate increments before connecting external evidence.
   - Pros: follows the documented roadmap; produces progressively useful planning behavior without waiting for every provider; keeps source-dependent work optional.
   - Cons: requires several domain decisions and migrations; the first slices are operational planning rather than market intelligence.
   - Effort: Medium to High across multiple changes.

3. **Full planning, market, marketplace, and finance platform** — Implement campaign management, calendars, resources, costs, external sources, simulators, commodities, export, marketplace, credit, and insurance as one change.
   - Pros: complete narrative and fewer visible pending surfaces.
   - Cons: contradicts current evidence and roadmap sequencing; would invent identity, source, commercial, regulatory, and financial rules; very high coupling and migration risk.
   - Effort: Very High.

### Recommendation

Proceed with Approach 1 for this exploration's proposal boundary, then split implementation into the DAG rather than treating the requested domains as one release. The first change should be an Agronautas-only, read-only capability/evidence contract plus a field-to-planning context surface. It may expose existing climate/risk evidence and honest unavailable states for campaigns, calendars, resources, costs, scenarios, market, commodities, export, marketplace, credit, and insurance.

Treat the assumptions-only calculator as the first candidate follow-up after `G1`/`G2` and a precise manual input contract. It can produce transparent arithmetic only from user-provided values, with explicit units, currency, assumptions, uncertainty, and `insufficient_evidence`; it must not call the risk engine a profitability model or turn climate/risk scores into prices, yields, margins, or returns.

Defer durable calendars, resources, and costs until campaign/workspace semantics are defined. Defer source-backed scenarios, market/commodity/export intelligence, and all marketplace/credit/insurance workflows until provider evidence, provenance/freshness, identity, commercial or regulatory policies, and human-review boundaries are available. Keep Agronautas and Iberá-Alerta namespaces separate and do not alter the existing risk-engine canonical gate.

### Risks

- A campaign or calendar table added before workspace ownership and lifecycle rules could create records that cannot be scoped, assigned, audited, or safely migrated.
- Existing demo/mock evidence and UI copy must never become economic inputs. Zero, empty, or illustrative values are not equivalent to unavailable data.
- Generic `SignalIngestionRun.evidencePayload` is not a sufficient economic time-series model without observed timestamps, units, currency, source lineage, quality, and revision policy.
- Climate evidence is real only for the current Open-Meteo path; provider taxonomy and adapter seams do not prove soil, price, FX, market, or historical climate availability.
- Risk and rentability are different domains. The unresolved `risk-v0` versus `open-meteo-basic-v1` engine decision must not be hidden inside a simulator.
- Marketplace, export, credit, and insurance introduce participant identity, authorization, terms, moderation, privacy, regulation, and third-party responsibility that cannot be inferred from the current global role token.
- A scenario result can be mistaken for a recommendation or forecast unless the contract distinguishes observed facts, user assumptions, calculated outputs, and human decisions.

### Ready for Proposal

Yes. The proposal should scope the evidence-first capability/read-model slice, define the unavailable-state matrix and planning-context boundary, preserve existing Agronautas/Iberá separation and risk-engine uncertainty, and list the DAG as deferred follow-up changes. It should not promise live economic sources, durable campaign management, market/marketplace functionality, credit, insurance, or profitability conclusions in the first slice.
