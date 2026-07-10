# Proposal: ibera-alerta-production-500-fix

## Problem

Production `GET https://www.agronauta.com.ar/api/hydrology/municipalities` returns HTTP 500 even though the production Neon database is seeded with municipality and telemetry rows. The previous assumption that the endpoint failed because tables were empty is now false. The remaining likely failure layers are: Express repository/query/contract parsing, Next.js BFF proxy/runtime forwarding, or production environment mismatch.

## Goals

- Identify whether the 500 originates in Express/API, Next.js BFF proxying, or production env configuration.
- Make `GET /api/hydrology/municipalities` resilient and diagnosable when production data is present but malformed, partially mapped, or schema-drifted.
- Prevent the web BFF from silently falling back to localhost in production or throwing unstructured server-side 500s on upstream fetch failures.
- Add production-shaped automated coverage for the repository, Express route, and BFF error paths.
- Verify the fix with real production HTTP smoke against `https://www.agronauta.com.ar/api/hydrology/municipalities`.

## Non-Goals

- Do not reseed or wipe production Neon data as the primary fix.
- Do not expose secrets, full connection strings, bearer tokens, stack traces, or raw SQL parameter values in public responses or OpenSpec artifacts.
- Do not replace all hydrology provider clients in this change.
- Do not change the public municipality contract unless diagnostics prove the current contract is impossible to satisfy safely.

## Proposed Changes

1. **Classify the failing layer**
   - Run/record direct Express API smoke if a direct API URL or Render service URL is available.
   - Compare with web-origin BFF smoke at `https://www.agronauta.com.ar/api/hydrology/municipalities`.
   - Use request IDs to correlate BFF and API logs.

2. **Backend diagnostic hardening**
   - Wrap the municipalities GET handler around repository execution and Zod validation with endpoint-specific logging.
   - Log non-secret details: request ID, phase (`repository_query` vs `contract_validation`), row/municipality counts when available, and normalized error code.
   - Return a structured contract error for known validation/config failures instead of an opaque unhandled 500, while keeping internal details server-side.
   - Add tests with production-shaped rows: 18 municipalities, 38 telemetry records, missing/empty mappings, `null` telemetry fields, invalid URLs/dates/enums, and forecast confidence constraints.

3. **Repository query robustness**
   - Verify `municipalityTelemetrySql` against production schema: `agronautas_municipalities`, `municipality_gauge_mappings`, and `hydrology_telemetry` column types.
   - If production SQL fails, adjust the array/ANY lateral subquery with explicit `text[]` casts or a safer CTE/un-nest pattern.
   - Ensure municipalities still return with `latestTelemetry: []` when mappings or telemetry are absent.

4. **BFF proxy robustness**
   - In production, require `AGRONAUTAS_API_INTERNAL_URL` to be configured to a non-localhost upstream for hydrology proxying.
   - Catch upstream `fetch()` failures and return structured JSON with `502`/`503`, request ID, and non-secret failure classification.
   - Preserve upstream status/content-type/body without crashing on streamed response handling in the deployed Next.js runtime.

5. **Final production proof**
   - After implementation/deploy, run real smoke against `https://www.agronauta.com.ar/api/hydrology/municipalities`.
   - Acceptance requires HTTP 200 JSON with `contractVersion: hydrology-government-municipalities-v1`, `province.provinceCode: AR-W`, and non-empty `municipalities` consistent with the seeded production DB.

## Acceptance Criteria

- The failure layer is documented as API query/validation, BFF proxy/runtime, or env mismatch with evidence.
- Backend logs identify whether the failure occurs before/after DB query and before/after Zod contract parse, without leaking secrets.
- The BFF does not use `http://localhost:3001` fallback in production and returns structured upstream errors instead of an unclassified 500.
- Production-shaped tests cover the seeded DB case and BFF upstream failure/env mismatch cases.
- Real production smoke returns `200` for `GET https://www.agronauta.com.ar/api/hydrology/municipalities` after deployment, or the remaining blocker is explicitly external and evidenced.

## Rollback / Safety

- Backend and BFF diagnostics are additive and can be rolled back independently.
- Public error bodies must remain generic; detailed diagnostics stay in logs.
- No production data deletion or destructive migration is planned.

## Next Recommended Phase

Proceed to spec/design, then tasks/apply for a layered API+BFF fix and production verification.
