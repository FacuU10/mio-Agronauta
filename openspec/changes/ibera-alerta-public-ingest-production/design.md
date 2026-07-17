# Design: Secure Iberá Alerta Production Ingest

## Technical Approach

Launch with the existing authenticated `POST /api/hydrology/ingest`; do not add a public forwarder. `createHydrologyGovernmentRouter` already rejects a missing token before admission, while `createHydrologyIngestionCoordinator` supplies concurrency/rate admission and the runner persists source results. Keep in-process scheduling disabled on sleep-prone hosting; configure one external scheduler job to invoke the existing route with a secret header. This implements the proposal without provider/client rewrites.

## Architecture Decisions

| Decision | Option / tradeoff | Decision and rationale |
|---|---|---|
| Direct ingress | Anonymous facade is simpler but lets attackers spend provider/DB capacity. | Preserve `x-hydrology-ingest-token` comparison in `apps/api/src/presentation/routes/hydrology-government.ts`; missing, invalid, or unset server token returns 401 before parsing/admission. No `Authorization` fallback or browser path is introduced. |
| Facade | A managed identity facade needs verified issuer, signature/replay validation, WAF limit, audit logging, and a server-side secret. | Do not deploy one: no configured identity/edge adapter exists in this repository. Reconsider only after provider evidence establishes every control. |
| Scheduler | `startHydrologySchedulerFromEnv` runs process-local hourly PNA/INMET/SMN and daily INA work; it depends on a continuously alive API process. | Set `HYDROLOGY_SCHEDULER_ENABLED=false` in production and use one provider-managed HTTP scheduler. This avoids duplicate workers and sleep-related cadence loss. |
| Secret hygiene | Narrow ignores currently cover only selected names. | Expand root `.gitignore` to `.env`, `.env.*`, `*.env`, `*.env.*`, then `!*.env.example`. Keep only placeholders in `apps/api/.env.example`, e.g. `HYDROLOGY_INGEST_TOKEN=replace-with-secret-manager-reference`; never use a real token. |

## Data Flow

    Scheduler secret store
             │ masked x-hydrology-ingest-token
             ▼
    POST /api/hydrology/ingest ──401──► invalid/missing credential
             │ 202 {runId, proofRunId, statusPath}
             ▼
    coordinator ──► government runner ──► repository / ingestion-run rows
             │                                      │
             └──► structured logs / scheduler receipt ◄── GET status + bounded data read

The scheduler sends the documented ingest request body, at most once per configured window; a 401/429/5xx is recorded as failed, not retried in a tight loop. The existing route's 202 response is not proof of completion; evidence must correlate `proofRunId` with completion logs/rows.

## File Changes

| File | Action | Description |
|---|---|---|
| `.gitignore` | Modify | Apply env wildcard/exception policy. |
| `apps/api/.env.example` | Modify | Add non-secret token and scheduler examples. |
| `apps/api/src/presentation/routes/hydrology-government.test.ts` | Modify | RED tests for unset/missing/invalid/valid header behavior before runner admission. |
| `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.test.ts` | Modify | Preserve disabled-startup and no-overlap assumptions. |
| provider scheduler + secret manager | Configure | Out-of-repo job, masked header, disabled internal scheduler, audit evidence; no repo provider file exists. |

## Interfaces / Contracts

```http
POST /api/hydrology/ingest
x-hydrology-ingest-token: <secret-manager-injected value>
Content-Type: application/json

{ "contractVersion": "1.0.0", "reason": "scheduled-production-ingest", "proofRunId": "opaque-id" }
```

Missing/invalid credentials MUST return 401 and MUST NOT start a provider call. A valid request retains 202 and the existing status contract. Secret scanning audits tracked paths and provider/CI scan status only; reports redact values and token-shaped strings.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit (RED first) | Header absent, wrong, unset server token, and valid token; no runner call on 401. | Existing route test app with env isolation and stub runner. |
| Unit | Ignore wildcard accepts `*.env.example` but rejects named/nested env variants. | A focused repository-policy test using Git ignore semantics, with no secret fixture. |
| Integration | Disabled internal scheduler, one authenticated external-equivalent request, 202-to-observed completion. | API test plus a sanitized `proofRunId` receipt. |
| Operational | Secret manager binding, job cadence/header masking, one run, health/data read. | Provider audit export/log links and bounded read-only checks; no secret output. |

## Threat Matrix

| Boundary | Applicability | Design response / RED tests |
|---|---|---|
| Documentation-like paths | N/A — no executable classification. | None. |
| Git repository selection | N/A — no repository-selection logic. | None. |
| Commit state | N/A — no Git automation. | None. |
| Push state | N/A — no push automation. | None. |
| PR commands | N/A — stacked delivery is process-only, not command implementation. | None. |

## Migration / Rollout

No data migration. First apply ignore/example and tests, then configure secrets and one scheduler job out of repo. Run secret scan/audit without values, deploy, execute one authorized run, and retain a sanitized receipt. Roll back by disabling the job, keeping `HYDROLOGY_SCHEDULER_ENABLED=false`, revoking/rotating its credential, and reverting this change only; read APIs remain available.

## Open Questions

- [ ] Which production scheduler/secret-manager provider and audit-export format are approved?
- [ ] Can that provider inject a custom secret header and expose run IDs/logs without revealing it?
- [ ] What approved cadence and timeout/retry policy meets provider quotas?
