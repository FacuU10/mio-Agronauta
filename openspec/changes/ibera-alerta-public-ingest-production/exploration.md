## Exploration: ibera-alerta-public-ingest-production

### Current State
The hydrology ingestion route `POST /api/hydrology/ingest` is designed to trigger automated telemetry fetching from four official Argentinian government sources: Prefectura Naval Argentina (PNA), Instituto Nacional del Agua (INA), Instituto Nacional de Tecnología Agropecuaria/Meteorología (INMET), and Servicio Meteorológico Nacional (SMN). The endpoint is protected by a token-based authorization mechanism, checking the `x-hydrology-ingest-token` header against the `HYDROLOGY_INGEST_TOKEN` environment variable. A previous bypass allowed non-production environments to run without token verification; this bypass has been successfully removed in the staged code, enforcing token authentication across all environments.

### Affected Areas
- `apps/api/src/presentation/routes/hydrology-government.ts` — Location of the `isHydrologyIngestAuthorized` authorization logic and the `/ingest` route handlers.
- `apps/api/src/presentation/routes/hydrology-government.test.ts` — Integration tests verifying route authentication, status observation, and coordinator rate-limiting behavior.
- `.env` / `.env.example` — Configuration storage for the required `HYDROLOGY_INGEST_TOKEN` secret.

### Approaches
1. **Mandatory Token-Based Authorization (Current Hardened Approach)** — Enforce token checks across all environments (production, staging, and development) without exception.
   - Pros:
     - Robustly protects official third-party government APIs from outbound request spam and IP blacklisting.
     - Prevents database write-bloat, connection pool starvation, and locking issues on telemetry tables.
     - Protects in-process IP-rate limits from starvation by distributed requests.
     - Eliminates data-integrity risks such as unauthorized insertion or override of `proofRunId` correlation runs.
   - Cons:
     - Requires secure management and distribution of the `HYDROLOGY_INGEST_TOKEN` secret to authorized operators and external cron providers.
   - Effort: Low (already implemented and staged in the current worktree).

2. **Public Unauthenticated Access (No-Token Bypass Approach)** — Expose the endpoint publicly without requiring any credentials, relying only on IP-based rate limiting.
   - Pros:
     - Easier testing and integration for external systems as no token secrets need to be distributed or managed.
   - Cons:
     - High risk of the production server's IP being throttled or banned by official government APIs due to scraper flood.
     - High risk of Postgres database CPU spikes and table bloat from spam writes.
     - IP-based rate-limits can easily be bypassed by attackers using distributed botnets, starving legitimate cron runs.
     - Serious data-integrity risks as anyone could inject custom `proofRunId` values, messing up audit records and run correlation histories.
   - Effort: Medium (requires reverting the staged security hardening and adapting the test suite).

### Recommendation
Approach 1 is strongly recommended. Making the ingest endpoint public poses immediate security, performance, and external service disruption risks. Enforcing mandatory token verification ensures the stability, reliability, and integrity of the Iberá-Alerta telemetry pipeline.

### Risks
- **Token Leakage**: If `HYDROLOGY_INGEST_TOKEN` is compromised, unauthorized entities could trigger scraper requests. (Mitigation: Use a strong, rotated secret stored securely in secret manager; never commit it to Git).
- **External Cron Starvation**: If the external cron fails to include the correct token header, scheduled ingestion will fail. (Mitigation: Thoroughly document external cron headers and verify execution logs in staging).

### Ready for Proposal
Yes — The security hardening is complete, and the codebase is fully verified with 100% green tests. The next step is to proceed with the Proposal phase to outline the deployment plan.
