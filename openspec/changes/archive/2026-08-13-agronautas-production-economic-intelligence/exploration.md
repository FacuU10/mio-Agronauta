## Exploration: agronautas-production-economic-intelligence

### Current State
Agronautas has a real field-to-risk dashboard seam, but not a production economic-intelligence capability. The current implementation accepts Argentina/Corrientes field context and several crops, persists fields, field context, signal ingestion runs, risk snapshots, alert snapshots, and durable recompute jobs, then exposes these through the Express `/agronautas` API and a Next.js dashboard.

What is source-backed today:

- Field intake, crop/category validation, hectares, locality, coordinates, geometry status, field index, risk current/timeline, alert current/timeline, dashboard payload, climate timeline, recompute, PDF text export, and grounded chat contracts exist.
- The Python worker performs a real Open-Meteo seven-day climate fetch and persists the climate ingestion run and a risk snapshot. The TypeScript climate adapter and ingestion job provide a typed adapter/normalization seam with latest-good degradation behavior.
- Risk computation currently uses climate, optional satellite summary, and field context. `risk-v0` and `open-meteo-basic-v1` are both represented in golden vectors, but the canonical engine gate is explicitly `undecided`; the exploration must not select or imply parity for either engine.
- Provider taxonomy and scheduler entries exist for Open-Meteo climate, SMN alerts, NASA FIRMS fire, and Sentinel STAC satellite, but only Open-Meteo is proven as a real worker path. SMN/FIRMS adapters are provider wrappers, and Sentinel is explicitly an injectable seam.
- Soil is present only as a signal taxonomy (`hydric_soil` in the shared Zod contract, `soil` in the API repository type), stale/mock dashboard examples, and a future provider/cadence concept. No verified soil provider ingestion or soil persistence model was found.

What is absent or not proven:

- No contracts, providers, repositories, migrations, or UI data paths exist for observed crop yields, agronomic production baselines, market prices, dollar exchange rates, price trends, input/labor/machinery costs, revenue, margins, profitability, financing, or economic scenarios.
- No planting recommendation use case exists. The existing UI action text is risk-oriented and the existing climate explanation schema is imported but not served as an implemented economic or planting recommendation flow.
- No economic data source policy, source cadence, currency/unit model, time-series storage, scenario input model, or evidence state for prices/costs/dollar was found.
- The strategic Agronautas documents describe future market, dollar, cost, margin, and scenario capabilities, but they are product intent rather than executable contracts or provider evidence.
- The current storage model has generic `signal_ingestion_runs.evidencePayload` and JSON fields on snapshots, but no bounded economic observation tables or repository ports. `Field` stores crop and hectares but not production history, expected yield, cost basis, or price basis.

### Affected Areas
- `packages/zod-schemas/src/agronautas.ts` — current field, signal, evidence, dashboard, risk, and climate-explanation contracts; the explanation contract already requires `engine.selectionStatus: 'undecided'` but has no economics.
- `packages/contracts/schemas/agronautas-contracts.v1.schema.json` — shared Python/TypeScript validation boundary; no economic observation or scenario contract is present.
- `packages/contracts/risk-engine/golden-vectors.json` — records divergent `risk-v0` and `open-meteo-basic-v1` results with `canonicalEngine.status = undecided`.
- `apps/api/src/domain/entities/agronautas.ts` — field, climate, satellite, risk, freshness, degradation, and evidence foundations; no soil/economic domain entities.
- `apps/api/src/domain/repositories/agronautas.ts` — field/context/signal/risk/alert/job ports; no economic observation or recommendation ports, and signal-type naming differs between this file and the shared Zod taxonomy.
- `apps/api/src/application/usecases/compute-field-risk-usecase.ts` — current deterministic risk composition is climate/satellite/context only and must remain separate from any future profitability calculation.
- `apps/api/src/infrastructure/jobs/agronautas-signal-ingestion-job.ts` — climate/satellite ingestion and latest-good fallback pattern that a future evidence adapter could follow without claiming missing data.
- `apps/api/src/infrastructure/adapters/agronautas-provider-adapters.ts` — real Open-Meteo adapter path plus SMN/FIRMS/Sentinel seams; no soil, price, FX, or cost adapter.
- `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` — real Open-Meteo worker execution and current `open-meteo-basic-v1` risk output; no multi-domain economic ingestion.
- `apps/api/prisma/schema.prisma` and `apps/api/prisma/migrations/*agronautas*` — persisted field, signal, risk, alert, geometry, and job data only; no economic storage.
- `apps/api/src/presentation/routes/agronautas.ts` — existing dashboard/risk/climate routes and evidence assembly; no economic or planting-recommendation endpoint. The imported climate explanation schema is not an implemented route response.
- `apps/web/src/lib/agronautas/service.ts`, `apps/web/src/lib/agronautas/schemas.ts`, and `apps/web/src/components/agronautas/workspace.tsx` — existing dashboard-first UI/service boundary with climate, risk, hydrology, provenance, degraded states, and future-capability cards; no economic query or recommendation rendering.
- `docs/agronautas-contexto-integral*.md` and `openspec/agronautas-strategic-expansion/proposal.md` — strategic intent only; useful for vocabulary, not evidence that prices, soil, or economics exist.

### Approaches
1. **Economic intelligence foundation with explicit unavailable states** — Add only versioned capability/evidence contracts and a read-only vertical slice that reuses persisted field, crop, climate, risk, freshness, and provenance data. Render soil, prices, dollar, costs, scenarios, and profitability as unavailable/insufficient-evidence states, and make the planting recommendation explicitly blocked until required observed inputs exist.
   - Pros: Smallest source-backed slice; no invented economic values; preserves existing dashboard and degradation conventions; keeps risk-engine selection undecided.
   - Cons: Delivers an evidence boundary rather than an economic calculation; needs a later provider/storage slice before producing recommendations.
   - Effort: Medium

2. **First real soil-plus-climate agronomy slice** — Implement one verified soil provider and normalized soil observations alongside the existing climate path, then provide an evidence-backed crop-context explanation without prices or profitability.
   - Pros: Adds meaningful agronomic signal and strengthens the existing risk/climate seam.
   - Cons: Provider and dataset availability are not established in this repository; still cannot support economic recommendations or profitability; soil semantics and coverage would need external evidence first.
   - Effort: High

3. **Full production economic intelligence pipeline** — Add provider-backed soil, crop, price, FX, cost, trend, scenario, recommendation, and profitability contracts, storage, scheduled ingestion, risk/economic computation, and UI in one change.
   - Pros: Closest to the strategic end state.
   - Cons: Requires multiple unverified providers and domain policies; high migration and contract coupling; would encourage fabricated defaults or premature engine decisions.
   - Effort: Very High

### Recommendation
Proceed with Approach 1 as the smallest defensible vertical slice. Start from the existing `/fields/:fieldId/dashboard` contract and persisted evidence, add an explicit evidence-first intelligence view model only where the source data exists, and expose missing domains as honest unavailable states rather than placeholders with values. The first recommendation response should be an explainable `insufficient_evidence` outcome that cites the available field/climate/risk evidence and names the missing soil, crop-history, price, FX, and cost inputs required before a planting or profitability conclusion can be made.

Do not modify the canonical risk-engine gate: `risk-v0` and `open-meteo-basic-v1` remain divergent alternatives with `selectionStatus/status = undecided`. Do not derive prices, soil properties, yield, costs, dollar values, trends, scenarios, margins, or profitability from the existing climate/risk numbers.

### Risks
- Shared signal vocabulary is inconsistent: Zod uses `weather`, `satellite_vegetation`, and `hydric_soil`, while API domain/repository code uses `climate`, `satellite`, and `soil`; an additive contract needs an explicit mapping rather than silently changing existing values.
- Existing demo/mock services contain illustrative soil and satellite evidence. They must not be treated as provider-backed production data or copied into real economic calculations.
- The current real worker proves Open-Meteo climate only; provider taxonomy, scheduler cadence, or a provider matrix entry does not prove real ingestion.
- Generic JSON evidence storage is insufficient as a durable economic model without clear units, currencies, observed timestamps, source lineage, and scenario semantics.
- A recommendation UI can easily turn risk signals into ungrounded agronomic advice; recommendation eligibility must require the actual observed inputs and preserve degraded/missing states.
- Economic and planting domains could accidentally couple to the undecided risk engine; they need an explicit engine reference and must not claim canonical parity.

### Ready for Proposal
Yes. The proposal should define an evidence-first, read-only foundation slice with explicit unavailable states and an `insufficient_evidence` recommendation outcome. It should defer provider selection and economic calculations until source contracts, actual provider evidence, units/currency rules, and durable storage requirements are established; it should explicitly preserve the risk-engine undecided gate.
