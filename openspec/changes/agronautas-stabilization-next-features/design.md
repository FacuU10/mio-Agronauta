# Design: Agronautas Stabilization and Next Features

## Technical Approach

Stabilize the existing Agronautas diff as a candidate patch set, not as trusted work. First remove generated/cache noise and lock deterministic gates; then prove provider, scheduler, dashboard, PDF, and feature claims with failing tests before implementation. Next-feature work is allowed only after the stabilization gate is green.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Salvage strategy | Slice triage: keep code only when backed by tests and canonical commands. | Blind reset; accept current diff. | Proposal rejects blind reset, but current mixed tree includes generated artifacts and unproven claims. |
| Artifact policy | Track source, specs, tests, SQL seeds, and scripts; ignore generated outputs: `dist/`, `.next/`, `.turbo/`, `coverage/`, `*.tsbuildinfo`, Python `__pycache__/`, egg-info, maps/declarations emitted beside source. | Commit generated output for deployment confidence. | Builds must be reproducible; generated files currently obscure review and false-green risk. |
| Build determinism | Use clean package builds and non-cached web/schema gates: `@repo/zod-schemas#build.cache=false`, `web#build.cache=false`, explicit schema `build:ensure` before Next. | Trust Turbo cache globally. | Current `turbo.json` already disables schema/web cache; formalize this as release policy. |
| Provider truth model | Add explicit provider `mode`: `live`, `fixture`, `placeholder`, `disabled`; status: `fresh`, `stale`, `degraded`, `missing`; evidence must include source URL, observed time, confidence, and degradation reasons. | Infer truth from provider name or runtime mode. | `PlaceholderRealProviderAdapter` currently can mask placeholder behavior behind real provider labels. |
| Scheduler persistence | Source cadence repository owns cadence and last-success; scheduler computes due windows from persisted successes and records next due/failures in status payload. | In-memory `Map` only. | `createAgronautasSchedulerRuntime` already accepts `getLastSuccess`; wire it to repository-backed truth. |
| Ingestion backoff safety | Retry waits MUST be 45s, 5m, 10m, and 15m for attempts 1-4; if the source still fails, desist until the next scheduled hourly run. | Tight retry loops; exponential retry without cap. | Protects national providers from API blocks and involuntary DDOS while preserving hourly recovery. |
| Module boundary | Iberá-Alerta remains untouched as a separate module. | Share retry logic or refactor Iberá-Alerta during this change. | User-approved scope keeps Agronautas stabilization isolated. |
| Dashboard/PDF parity | Create one backend dashboard payload contract and let UI and PDF render from it; no client-side recomputation. | Separate PDF route assembly. | Existing UI copy promises PDF uses the same persisted payload; enforce via contract tests. |
| Implementation boundaries | Four grouped subagent slices: hygiene/build, provider/scheduler, dashboard/PDF, verify/review. | One large apply agent. | Reduces review load and makes rollback slice-local. |

## Data Flow

    Provider adapters -> signal ingestion repository -> summaries/snapshots
          │                         │
          └ provider mode/status ───┤
    source cadence repository -> scheduler due windows -> job runs/last success
                                      │
    dashboard payload assembler <─────┘
          ├─ API `/fields/:id/dashboard`
          ├─ UI cards/alerts/status
          └─ PDF export route

## File Changes

| File | Action | Description |
|---|---|---|
| `.gitignore` | Modify | Add `*.tsbuildinfo`, `__pycache__/`, `*.pyc`, `*.egg-info/`, emitted `*.js`, `*.d.ts`, maps under package `src/` when generated. |
| `turbo.json`, `package.json`, app/package scripts | Modify | Add canonical clean/build/test commands and document no-cache release gates. |
| `packages/zod-schemas/src/agronautas.ts` | Modify | Add provider mode/status and shared dashboard/PDF payload schemas. |
| `apps/api/src/infrastructure/adapters/agronautas-provider-adapters.ts` | Modify | Rename placeholder semantics or add explicit mode; never market placeholder as live. |
| `apps/api/src/infrastructure/jobs/agronautas-scheduler.ts` | Modify | Consume persisted last-success/cadence and expose next-run status. |
| `apps/api/src/presentation/routes/agronautas.ts` | Modify | Serve shared dashboard payload and PDF from same assembler. |
| `apps/web/src/lib/agronautas/*`, `apps/web/src/components/agronautas/*` | Modify | Render provider truth, scheduler status, PDF parity from backend payload. |
| `docs/runbooks/agronautas-production-hardening.md` | Modify | Record verify matrix and fresh-context pessimistic review gate. |

## Interfaces / Contracts

Provider evidence extends current evidence with `mode`, `status`, `lastSuccessfulObservedAt`, `nextDueAt`, and optional `failureReason`. Dashboard/PDF payload becomes the single `dashboardSnapshotSchema` source, parsed by API tests, web service tests, Playwright, and PDF tests.

Ingestion retry status MUST expose the extended backoff window: attempt 1 waits 45 seconds, attempt 2 waits 5 minutes, attempt 3 waits 10 minutes, attempt 4 waits 15 minutes, and any further failure desists until the next scheduled hourly run.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `.gitignore` policy, schema exports, provider mode taxonomy, scheduler due windows from persisted last-success. | Node tests and API tests written first. |
| Integration | API dashboard payload, PDF route parity, job-run failure/last-success status, extended backoff/desist behavior. | Express route tests with fake repositories. |
| E2E | Agronautas dashboard shows provider mode, scheduler freshness, PDF export link, no false live claims. | Playwright `apps/web/tests/e2e/agronautas-*.spec.js`. |
| Verify | Fresh clean gates. | `pnpm test`, `pnpm build`, `pnpm --filter web test:e2e`, plus clean no-cache release command documented in runbook. |

## Migration / Rollout

No destructive migration required. If persistence fields are absent, derive `missing`/`degraded` status and block live claims until repositories prove last success. Next-feature slices remain gated behind green stabilization verification.

## Open Questions

- [ ] Exact PDF implementation file is not yet present; tasks must discover or create the route only after dashboard payload tests fail.
