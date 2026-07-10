# Design: ibera-alertas-production-real-smoke

## Technical Approach

Verification will be a production-only smoke against the deployed web origin `https://www.agronauta.com.ar`, with `http://www.agronauta.com.ar` fallback only if HTTPS fails to connect. The verifier must issue real HTTP requests, inspect returned JSON/HTML directly, and record evidence in the verification report. Local tests may be mentioned as non-proof, but cannot satisfy this change.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Proof source | Real HTTP responses from `www.agronauta.com.ar` | Unit/contract/local tests | User explicitly rejected tests as proof; production routing/env/data must be exercised. |
| API path | Web-origin `/api/hydrology/*` first | Direct API base first | The browser page depends on the Next.js BFF route, so the web origin is the user-visible contract. |
| Ingest method | `POST /api/hydrology/ingest` with contract body | `GET /api/hydrology/ingest` | Code only mounts POST; request schema requires `contractVersion`, optional `source`, optional `reason`. |
| Safety | One scoped PNA ingest attempt; classify non-202 statuses | Repeated retries/all-source ingest | Ingest mutates run history and may call providers; scoped evidence is enough. |

## Data Flow

```text
Verifier
  ├─ GET https://www.agronauta.com.ar/api/hydrology/municipalities
  │    └─ Next.js BFF route ──→ Express /api/hydrology/municipalities ──→ PostgreSQL hydrology data
  ├─ GET https://www.agronauta.com.ar/municipalities
  │    └─ Next.js page + GovernmentOverview ──→ browser fetches same BFF endpoint
  └─ POST https://www.agronauta.com.ar/api/hydrology/ingest
       └─ BFF forwards body/auth ──→ Express ingest runner ──→ provider clients + persistence
```

## File Changes

| File | Action | Description |
|---|---|---|
| `openspec/changes/ibera-alertas-production-real-smoke/spec.md` | Create | Delta requirements for real production smoke. |
| `openspec/changes/ibera-alertas-production-real-smoke/design.md` | Create | Verification design and exact smoke sequence. |

No application code changes are required for this phase.

## Interfaces / Contracts

### Base URL selection

1. Try `https://www.agronauta.com.ar`.
2. If DNS/TLS/connectivity fails, retry the same checks with `http://www.agronauta.com.ar`.
3. Record every attempted URL, status, content-type, and failure reason.

### Exact real smoke steps for verification

1. `GET {BASE}/api/hydrology/municipalities`
   - Accept only real HTTP response evidence.
   - Expected: `200`, JSON content-type, `contractVersion === "hydrology-government-municipalities-v1"`, `province.provinceCode === "AR-W"`, `Array.isArray(municipalities)`.
   - Record: municipality count, first 3 `id/name`, `sourceFreshness`, and whether any municipality has non-empty `latestTelemetry`.

2. `GET {BASE}/municipalities`
   - Expected: `200`, HTML content-type, no obvious Next.js/global error document.
   - Validate direct HTML contains `Centro de Monitoreo Hídrico Provincial` or known locality text such as `Corrientes`, `Goya`, `Paso de los Libres`, or `Monte Caseros`.

3. `POST {BASE}/api/hydrology/ingest`
   - Headers: `Content-Type: application/json`; include auth only if already configured outside artifacts.
   - Body: `{"contractVersion":"1.0.0","source":"PNA","reason":"production-real-smoke"}`.
   - Expected execution: `202` JSON, `contractVersion === "hydrology-government-ingest-v1"`, `requestedSources` includes `PNA`, first result has `status` in `success|empty|failed|skipped`.
   - If status is `401/403/404/405/5xx`, classify and preserve response snippet; do not retry blindly.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Production smoke | API, page render, ingest route | Real HTTP fetches against selected base URL. |
| Local automated tests | Not proof for this change | Do not use as acceptance evidence. |

## Migration / Rollout

No migration required. This phase creates planning artifacts only; verification will execute the real smoke.

## Open Questions

None. Production URL is now supplied by the user.
