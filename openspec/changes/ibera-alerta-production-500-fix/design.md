# Design: ibera-alerta-production-500-fix

## Technical Approach

Fix the production 500 with a layered diagnosis and hardening pass. The seeded production database proves data absence is not the root cause, so implementation must instrument and test the exact request path: Next.js BFF `/api/hydrology/[...path]` → Express `/api/hydrology/municipalities` → `HydrologyRepository.getMunicipalityTelemetryOverview` → Zod response validation.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Diagnosis model | Classify by BFF config/runtime, API query, API validation, or env mismatch | Keep treating all failures as generic 500 | The DB is seeded; layer classification is required to avoid another wrong remediation. |
| Public errors | Structured generic JSON with request ID | Expose stack traces/SQL/Zod payloads | Operators need correlation; users must not receive secrets or internals. |
| BFF upstream config | Require explicit non-localhost upstream in production | Continue localhost fallback everywhere | A missing Vercel env can otherwise become an opaque production 500. |
| Repository SQL | Verify and only change if production/schema evidence shows failure | Rewrite query speculatively | The overview query does not use PostGIS geometry functions; avoid unnecessary SQL churn. |
| Proof | Real production HTTP smoke after deploy | Unit tests/direct DB counts only | User-visible failure is on deployed web origin. |

## Request Flow

```text
Browser / smoke checker
  └─ GET https://www.agronauta.com.ar/api/hydrology/municipalities
      └─ Next.js BFF route apps/web/src/app/api/hydrology/[...path]/route.ts
          ├─ validates production upstream env
          ├─ forwards request ID + safe headers
          └─ fetches Express upstream /api/hydrology/municipalities
              └─ apps/api/src/presentation/routes/hydrology-government.ts
                  ├─ repository query phase
                  │   └─ packages/hydrology-engine/src/repository.ts
                  ├─ response contract validation phase
                  │   └─ packages/zod-schemas/src/agronautas.ts
                  └─ JSON response or structured classified error
```

## Planned File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modify | Add route-level try/catch/logging around municipalities overview query and schema parse; return structured classified errors for known failures. |
| `packages/hydrology-engine/src/repository.ts` | Modify if evidence requires | Add safer array casting/CTE or row normalization only if production-shaped tests reproduce SQL/runtime failure. Preserve no-telemetry municipality behavior. |
| `packages/hydrology-engine/src/hydrology-engine.test.ts` | Modify | Add production-shaped overview fixtures covering seeded counts, missing mappings, null telemetry, and contract-safe conversions. |
| `apps/api/src/presentation/routes/hydrology-government.test.ts` | Modify | Add route tests for repository failure, contract validation failure, and structured error shape. |
| `apps/web/src/app/api/hydrology/[...path]/route.ts` | Modify | Add production upstream guard, fetch error handling, request-id propagation, and safe structured `502/503` responses. |
| `apps/web/src/app/api/hydrology/[...path]/route.test.ts` | Modify | Cover missing production upstream, localhost production guard, and thrown upstream fetch. |
| `openspec/changes/ibera-alerta-production-500-fix/*` | Create | Planning artifacts for this production fix. |

## Backend Design Details

### Route-level phase classification

The municipalities route should distinguish:

- `repository_query`: failures thrown by `getMunicipalityTelemetryOverview` / `db.query`.
- `contract_validation`: failures thrown by `hydrologyGovernmentMunicipalitiesResponseSchema.parse`.
- `unknown`: unexpected errors outside those phases.

The public response should be contract-style JSON with a stable code such as `HYDROLOGY_MUNICIPALITIES_UNAVAILABLE`, a generic Spanish message, `retryable: true`, and `details.requestId` / `details.phase` where safe. Logs should include sanitized error details and issue paths/counts.

### Repository query validation

The current overview SQL does not execute PostGIS functions; it joins these tables:

- `agronautas_municipalities m`
- `municipality_gauge_mappings mgm`
- `hydrology_telemetry ht`

If production reproduction shows SQL/type failure, prefer a narrow fix:

- Explicitly cast empty arrays as `ARRAY[]::text[]` / `NULL::text` where needed.
- Build station IDs in a CTE or lateral `unnest` to avoid ambiguous array concatenation.
- Keep `LEFT JOIN` behavior so municipalities without telemetry remain visible.

## BFF Design Details

### Upstream URL guard

`buildUpstreamUrl` or its caller should detect production runtime via `NODE_ENV === 'production'` and reject missing/localhost `AGRONAUTAS_API_INTERNAL_URL` for hydrology proxying. Local development and tests may keep the localhost fallback.

### Fetch failure handling

Wrap the upstream `fetch` in try/catch. On failure:

- Generate or preserve `x-request-id`.
- Log non-secret upstream host classification and error message.
- Return JSON with `502` or `503`, `content-type: application/json`, and request ID.
- Do not include bearer tokens, full URLs with credentials, cookies, or stack traces.

### Response forwarding

Continue preserving upstream status and `content-type`. If streaming `upstreamResponse.body` is implicated by production runtime evidence, switch to buffering with `await upstreamResponse.arrayBuffer()` for this JSON endpoint family while preserving status and headers.

## Testing Strategy

| Layer | Tests |
|---|---|
| Repository | Production-shaped fixture rows: seeded municipalities, 38 telemetry-style rows, empty mappings, null telemetry, valid forecast confidence. Assert no throw and valid response shape. |
| Express route | Mock repository success, repository throw, and schema-invalid payload. Assert success payload or classified structured error. |
| BFF | Mock upstream success, thrown fetch, missing production upstream, localhost production upstream. Assert status, JSON error, and request-id behavior. |
| Production smoke | Real `GET https://www.agronauta.com.ar/api/hydrology/municipalities` after deployment. Record status/content-type/count/samples. |

## Migration / Rollout

No destructive migration is planned. If schema drift is discovered, add a separate corrective migration only for the missing/incompatible schema element and verify against Neon before deployment.

Rollout sequence:

1. Add tests and diagnostics locally.
2. Deploy API+BFF fix.
3. Inspect correlated logs for first production request.
4. Run real production smoke.
5. Archive result with evidence.

## Open Questions

- Is there a direct production Express/Render URL available to bypass the web BFF for one diagnostic smoke?
- Is `AGRONAUTAS_API_INTERNAL_URL` set in the deployed web environment to the production API service, and is it non-localhost?
- Do production logs show a Zod validation error, SQL error, or BFF fetch/runtime error for the current 500?
