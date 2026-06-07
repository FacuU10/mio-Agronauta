# Proposal: MVP Production Launch

## Intent

Harden the MVP for production and make it ready for real-world tests by removing the current frontend CI blocker, reducing database connection-exhaustion risk in clustered API deployments, and validating operational readiness gates.

## Scope

### In Scope
- Fix `apps/web/src/components/landing/homepage.test.tsx` so Next.js 15/JSDOM image assertions accept URL-encoded or plain image paths.
- Harden `apps/api/src/infrastructure/database/postgres/pool.ts` with dynamic PostgreSQL pool sizing using explicit env overrides and cluster/CPU-aware safe defaults.
- Verify `GET /ready` is operational for PostgreSQL, Redis, and required runtime checks, with Mongo treated as degraded/non-blocking per existing hardening rules.
- Document immediate launch gates and defer larger “Future Enhancements” into milestones.

### Out of Scope
- Full JWT/refresh-token auth replacement.
- BullMQ recompute queues, WebSocket alerts, external satellite/weather production adapters, or multicrop expansion.
- Full observability stack rollout; structured logging/Pino and Sentry are proposed as next milestones unless already partially wired.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `production-readiness`: CI image rendering compatibility, safe PostgreSQL pool defaults, and readiness gate reliability.

## Approach

Use the smallest launch-safe patch set: make the image test tolerant of Next.js URL encoding (`%2F` or `/`), compute API pool max from env/cluster context with conservative production defaults, and run focused readiness checks/tests. Future enhancements are sequenced after launch: Pino structured logs first, then Sentry alerting, JWT auth, BullMQ, and WebSocket alerts.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/src/components/landing/homepage.test.tsx` | Modified | Flexible image path assertions for SSR/JSDOM. |
| `apps/api/src/infrastructure/database/postgres/pool.ts` | Modified | Dynamic pool sizing to avoid cluster connection exhaustion. |
| `apps/api` readiness routes/tests | Modified | Ensure `/ready` accurately validates required dependencies. |
| `docs/runbooks/agronautas-production-hardening.md` | Modified | Capture launch gates and future milestone sequencing if needed. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Pool too small under real load | Med | Env override plus conservative default; monitor saturation. |
| Readiness blocks deploy from transient Redis/Postgres latency | Med | Keep bounded timeouts and clear dependency status. |
| Scope creep from future enhancements | High | Defer auth/queues/alerts/WebSockets to separate changes. |

## Rollback Plan

Revert the test regex change, restore the prior fixed PostgreSQL pool max, and return `/ready` checks to the previous implementation. Because no schema migration is planned, rollback is code/config only.

## Dependencies

- Production env variables for DB/Redis/runtime endpoints and optional pool sizing override.
- CI commands for web/API tests.

## Success Criteria

- [ ] `homepage.test.tsx` passes with Next.js encoded image URLs.
- [ ] API pool max is bounded per worker/core and overrideable by env.
- [ ] `/ready` returns correct healthy/unhealthy status for required services.
- [ ] Future enhancements are documented as post-launch milestones.
