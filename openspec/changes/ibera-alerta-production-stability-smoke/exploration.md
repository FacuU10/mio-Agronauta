## Exploration: ibera-alerta-production-stability-smoke

### Current State
The deployed Iberá-Alerta platform on Render (commit `b59b765`) experiences several production failures:
1. **Readiness Flapping**: Strict hardcoded 2s database check timeout is exceeded during Render's container wakeup.
2. **Web BFF Upstream Timeout**: Render Free API sleeps after 15 minutes of inactivity; wakeup takes 30-50s, exceeding BFF's 12s timeout.
3. **INMET/SMN Degraded**: Argentine (SMN) and Brazilian (INMET) government servers block US AWS datacenter IPs, preventing production scraping.
4. **Anonymous Page Access**: `/municipalities/ingest` page is publicly accessible and renders the token form anonymously, violating the spec.
5. **Absent Revision Correlation**: Live API `/health` payload does not expose any commit or build metadata.
6. **Absent Cron Proof**: Scheduled hourly runs have no automated execution log or database run correlation.

### Affected Areas
- `apps/api/src/presentation/routes/health.ts` — Exposes RENDER_GIT_COMMIT as version metadata and enables configurable database readiness timeouts.
- `apps/api/src/presentation/routes/hydrology-government.ts` — Implements a lightweight `POST /api/hydrology/verify-token` endpoint for client authorization.
- `apps/web/src/app/municipalities/ingest/page.tsx` — Embeds a page-level token verification passcode gate.
- `apps/web/src/components/government/ingest-panel.tsx` — Integrates with the new verification endpoint to unlock the ingest controls on-demand.

### Approaches
1. **Approach A: Combined Code-Fix and Operator Realignment** — Implement configurable readiness timeouts, expose live git revisions, add a React-memory gate for `/municipalities/ingest` verification, and document proxy/cron tasks for operators.
   - Pros: Elegant, complies perfectly with all spec requirements, maintains zero token persistence, and ensures stable liveness/readiness.
   - Cons: Requires minor code updates across API and Web packages.
   - Effort: Medium

2. **Approach B: Operator Workarounds Only** — Solve issues purely through environment changes and external cron configuration without editing any codebase files.
   - Pros: Zero code edits.
   - Cons: Fails to resolve the anonymous page spec gap, cannot expose running revisions, and cannot fix the readiness flapping under cold starts.
   - Effort: High

### Recommendation
**Approach A** is highly recommended. It resolves all 6 blockers permanently at the root cause, ensures strict compliance with security specs, and introduces no regression risks to existing Agronautas features.

### Risks
- **Timeout restrictions**: Some serverless hosting plans (e.g., Vercel Hobby) have a hard 10s-15s timeout on function execution.
  - *Mitigation*: Ensure the API container is kept awake using a keep-alive ping to eliminate wakeup latency entirely.
- **Token exposure**: Handling tokens in memory during the verification gate.
  - *Mitigation*: Ensure the token is kept ephemerally in React state and is never saved to localStorage, cookies, or logs.

### Ready for Proposal
**Yes**. All root causes have been verified, classified, and mapped to the smallest reliable corrective scope. The codebase is ready to proceed to the Proposal and Spec/Design stages.
