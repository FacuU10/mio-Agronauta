## Exploration: Iberá Alerta Browser Ingest UI

### Current State
The backend mounts a secured endpoint `POST /api/hydrology/ingest` which fetches and processes official hydrology telemetry. This endpoint requires token-based authentication via the `x-hydrology-ingest-token` header matching the `HYDROLOGY_INGEST_TOKEN` environment variable.

Currently, the Next.js frontend (`apps/web`) acts as a Backend-For-Frontend (BFF) proxy via `apps/web/src/app/api/hydrology/[...path]/route.ts`. However, this proxy has a strict header safelist (`FORWARDED_HEADERS = ['accept', 'content-type', 'x-request-id']`). Any client-side request sending `x-hydrology-ingest-token` is stripped of this header when forwarded to the Express API backend, causing requests to fail with a `401 Unauthorized`.

There is no existing browser-based interface to trigger ingestion. Operators must use manual `curl` or custom fetch code.

### Affected Areas
- `apps/web/src/app/api/hydrology/[...path]/route.ts` — BFF proxy must be updated to include `x-hydrology-ingest-token` in `FORWARDED_HEADERS`.
- `apps/web/src/app/municipalities/ingest/page.tsx` — (New) Operator Control Console for secure browser-triggered ingestion.
- `apps/web/src/components/government/ingest-panel.tsx` — (New) Highly-polished operator ingestion panel component.

### Approaches
1. **Integrated Panel on Civil Defense Dashboard**
   - Collapsible panel or drawer integrated directly into `GovernmentOverview` (`apps/web/src/components/government/overview.tsx`).
   - Pros: Highly integrated; operators see real-time updates instantly on the same screen.
   - Cons: Bloats the read-only dashboard component with mutation state.
   - Effort: Medium

2. **Dedicated Admin/Operator Ingest Route (`/municipalities/ingest`)**
   - A dedicated Next.js client page containing a specialized command center UI for authorized ingest triggers.
   - Pros: Clear separation of concerns; isolates secure mutation features from public monitoring; easy to secure at routing level.
   - Cons: Requires navigating to a separate route.
   - Effort: Low

### Recommendation
Approach 2 is recommended. Isolating the secure trigger interface to a dedicated route `/municipalities/ingest` ensures a clean architectural boundary, improves testability, and supports distinct styling appropriate for a command-center operator tool.

### Environment & Security Audit
- **Correct Local Env Locations**:
  - `apps/api/.env` is the correct location for the Express backend server runtime.
  - `monorepo-js-baseline/.env` (monorepo root) is used by local verification scripts.
  - `apps/web/.env` is used by the Next.js app.
- **Git History Secret Audit**:
  - `env.env` was committed in `1493df9ff889c252eda720d20bc2e2c75e442ef5` but only contained a database URL (`db`), not the ingestion token.
  - However, our scan detected literal string additions for `HYDROLOGY_INGEST_TOKEN` in the git log history with lengths of `9`, `137`, and `187` characters. This confirms that credentials have been committed in the past.
- **Safe Handling Constraints**:
  - The token must be entered via an input of `type="password"`.
  - It must reside solely in React memory state (`useState`) during the session. It must NEVER be persisted to `localStorage`, session storage, cookies, server logs, or Git.
  - The BFF proxy must only forward the header under safe same-origin contexts and must never log the token value.

### Risks
- **CORS/Proxy Bypass**: The same-origin proxy in Next.js completely circumvents browser CORS limitations, but the BFF must be updated to forward the auth header.
- **Token Exposure**: If the browser UI logs or caches the token, it could be recovered. (Mitigation: Bound token strictly to React memory state).
- **Hardcoded Secrets**: Ensure no developer-specific tokens or usernames (like `mauricio369`) are ever hardcoded in the codebase.

### Ready for Proposal
Yes — The architecture is fully understood, and the required BFF proxy modifications and new UI routes are clearly defined.
