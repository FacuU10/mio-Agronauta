# Design: Iberá-Alerta Local Real Production Fix

## Technical Approach

Keep the existing Express route and sequential `createGovernmentIngestionRunner()` model, but tighten the boundary between route startup errors and source execution errors. Provider/client failures after execution starts flow through the normal 202 ingest contract with per-source diagnostics. Only failures before runner execution, seeding, or contract shaping return structured 503. Verification is bounded to one local-real all-source API/runner call against the remote DB, then one production all-source POST plus municipalities GET.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Route classification | Add route-level classification/helpers in `hydrology-government.ts`: validate/auth first, call runner once, parse 202; catch only true startup/contract exceptions and emit safe 503. | Convert all errors to 202; expose raw exceptions. | Specs require provider failures as 202 but real startup/config/db failure as 503 without secrets. |
| Runner behavior | Preserve sequential one-attempt loop in `createGovernmentIngestionRunner`; if needed, move seeding into an explicit pre-source startup phase and keep source client exceptions captured as failed source results. | Parallel fan-out; retry/backoff loop. | Existing tests rely on source order and no DDoS; one source failure must not abort later sources. |
| Provider diagnostics | Extend `packages/hydrology-engine/src/clients/http-clients.ts` only if diagnostics lack safe fields: host/path, timeout/status/content/parse kind, attempts=1, elapsed/duration. | Add scraping or fixture fallback. | Current defaults can fail safely; production needs machine-readable URLs and honest degradation, not fake telemetry. |
| Verification | Add a local-real script/command artifact under `apps/api/src/scripts/` or `scripts/` that performs one bounded all-source API or direct-runner call and writes a timestamped JSON artifact. | Browser smoke, polling, repeated retries. | Provides reproducible proof against remote DB while enforcing anti-DDoS constraints. |

## Data Flow

`POST /api/hydrology/ingest` → auth/body parse → runner construction/seed startup → sequential sources `PNA → INA → INMET → SMN` → `HydrologyRepository.saveTelemetryDeduped` per source → 202 contract. If construction/seed/DB startup fails before any source executes, route catches and returns 503 with `startup_failure` diagnostics for requested sources.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modify | Add explicit ingest error classification, safe 503 helper, ensure provider failures from runner remain 202, and keep one attempt per source. |
| `apps/api/src/presentation/routes/hydrology-government.test.ts` | Modify | Add route tests for all-source provider failures returning 202 diagnostics and true startup failure returning 503. |
| `packages/hydrology-engine/src/clients/http-clients.ts` | Modify if needed | Preserve env overrides; add elapsed/duration or content-type/status diagnostics if missing, still no retries. |
| `packages/hydrology-engine/src/hydrology-engine.test.ts` | Modify if needed | Cover URL override diagnostics and single fetch call per source. |
| `apps/api/src/scripts/verify-hydrology-local-real.ts` | Create | One-shot local-real verifier: loads API env, calls `createApp()` on ephemeral local server or direct runner once, requests all sources, writes JSON artifact. |
| `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` | Modify | Document provider envs, local-real command, production deploy, and bounded smoke. |

## Interfaces / Contracts

No public request shape change. Response remains `hydrology-government-ingest-v1`: HTTP 202 for executed source outcomes with `requestedSources[]` and `results[].diagnostic`; HTTP 503 only for startup/config/db failures before source execution. Diagnostic fields remain schema-safe: `failureKind`, `reason`, `attempts: 1`, `timeoutMs`, `durationMs/elapsedMs`, `providerHost`, `providerPath`, `upstreamStatus`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Route 202 vs 503 classification | Inject runner success/provider-failure results and throwing startup runner in `hydrology-government.test.ts`. |
| Unit | No DDoS/provider diagnostics | Mock fetch/client calls; assert one call per source and sanitized provider fields. |
| Local-real | Remote DB/API behavior | Run `pnpm --dir apps/api tsx src/scripts/verify-hydrology-local-real.ts --mode=api --all-sources --out artifacts/hydrology-local-real.json`; exactly one POST or direct runner call. |
| Production smoke | Deployed behavior | Push/deploy `main`, then one authorized `POST /api/hydrology/ingest` and one `GET /api/hydrology/municipalities`; save responses. |

## Migration / Rollout

No migration required. Configure production `HYDROLOGY_INGEST_TOKEN` and verified `HYDROLOGY_*_URL` overrides before smoke. Deploy to `main`, confirm service health, execute the two bounded smoke calls, then leave scheduler cadence unchanged.

## Open Questions

- [ ] Exact verified machine-readable provider URLs may still need ops/product input; until then providers must degrade safely.
