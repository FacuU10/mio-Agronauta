schema: gentle-ai.verify-result/v1
change: ibera-alerta-production-completion
verified_revision: 3898543bac247466a1a7968d7009c7ca6fbecd6f
strict_tdd: true
status: warning
verdict: LOCAL_BUILD_GATE_FAILED
mvp_closure: withheld
blockers: 1
critical_findings: 1
requirements: 6/6
scenarios: 12/12
tasks: 23/23
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:4fea5d3d029fcc43aefb34260d0ea42fd49aff519a48be49c64cf4f63f0767b2
build_command: pnpm --dir packages/hydrology-engine build; pnpm --dir apps/api build; pnpm --dir apps/web build
build_exit_code: 1
build_output_hash: sha256:e44fff9b61be793ca46efc6a1fe27be761e4d41fbdb91a1661a33f4fe8c29ab2
evidence_hash: sha256:74760eba54884b6868efca1331be82ebec6ab4564ee17037f8fd79efcb37bb7a
persistence: hybrid
next_recommended: fixes-required

# Verification Report — Iberá-Alerta Production Completion

## Result

The SDD acceptance tests and local Playwright evidence pass, but this revision cannot receive the requested `pass-with-deferred-operations` / MVP-closure verdict: the current API and web production builds fail. No code, environment, review, commit, or push action was performed during this verification.

## Acceptance Criteria

| Requirement/scenarios | Result | Evidence |
|---|---|---|
| Reviewed municipal alert coverage (2/2) | PASS | Root suite includes coverage migration, idempotency, inactive rollback, and dynamic-ID exclusion tests. |
| Coverage-scoped projection/rendering (2/2) | PASS | API/UI tests plus Playwright match/no-match scenarios pass. |
| Single authenticated Cron ingress (2/2) | PASS | API suite covers missing/invalid token rejection and independent partial-source outcomes. |
| Bounded acceptance receipts (2/2) | PASS for local/degraded scope | Receipt schema and safe degraded paths are tested; paid-provider operations are deferred below. |
| Deferred timeline/long-range detail (1/1) | PASS | No new timeline/long-range API, UI, provider, or infrastructure is claimed by this change. |
| Canonical municipal response (3/3) | PASS | Canonical `officialAlerts[]`, empty telemetry, and overview mapping are covered by API/UI tests. |

## Executed Evidence

| Command | Exit | Result |
|---|---:|---|
| `pnpm test` | 0 | 6/6 Turbo test tasks passed: zod-schemas 29/29, hydrology-engine 54/54, API 186/186, web 54/54 (323 tests total). |
| `pnpm --dir packages/hydrology-engine build` | 0 | TypeScript build passed. |
| `pnpm --dir apps/api build` | 2 | Failed: existing `provider-matrix.ts` TS4111 and `scheduler-lock.test.ts` TS2532 diagnostics. |
| `pnpm --dir apps/web build` | 1 | Failed prerender of `/municipalities`: `PageNotFoundError: Cannot find module for page: /municipalities/page`. |
| `pnpm --dir apps/web exec playwright test tests/e2e/municipalities-alerts.spec.ts --reporter=line` | 0 | Local dev-server evidence: 2/2 scenarios passed (matched alert isolation; empty-alert detail state). |
| `git diff --check` | 0 | Clean before this report update. |

## Deferred-by-product-decision

The following are explicitly deferred and are neither executed nor claimed by this verification:

- Paid Render Cron provisioning, scheduling, and provider-managed execution receipt.
- Read-only production correlation from `proofRunId` to `hydrology_ingestion_runs`.
- Runtime `GROQ_API_KEY` configuration and a bounded real Groq stream.

Their status is `deferred-by-product-decision`; they are not the reason for the local build gate failure.

## Archive Readiness

Not ready for archive. Restore passing API and web production builds, then re-run this verification. If those local checks pass, the recommended outcome is `pass-with-deferred-operations`, MVP closure with `blockers: 0`, and `next_recommended: archive` while preserving the deferred operations above.
