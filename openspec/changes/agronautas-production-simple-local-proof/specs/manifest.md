# Specification Manifest

Change: `agronautas-production-simple-local-proof`

| Domain | Kind | Coverage |
|---|---|---|
| `local-proof-workflow` | New full spec | Setup, safe aliases, env-backed service topology, migrations, readiness, API/web/BFF, worker, hydrology, browser, IDs, idempotency, timeout, rollback |
| `production-launch-readiness` | New full spec | Secure env composition, provider/auth/tenant/lead/authorized-ingest boundaries, worker/Redis/Postgres/Cron, Render decision gate, redacted receipts, failure and rollback |
| `browser-acceptance-evidence` | Delta | Full-stack no-stub route matrix, explicit blocked/not-run states, attribution, IDs, secret redaction, BFF failure recovery |
| `runtime-evidence-foundation` | Delta | Expanded normalized runtime outcomes, durable completion boundary, redacted attribution, fail-closed production composition |

## Evidence Policy

Local and production evidence MUST use separate scopes and receipts. Runtime proof MUST use API, Postgres/PostGIS, Redis, and worker services supplied through environment variables or process configuration. Existing Spanish UI copy remains unchanged. No fake, stub, fixture, or inferred success can satisfy a live boundary. Missing owner authorization, credentials, deployment access, or runtime capability is an explicit `blocked` or `not_run` result.

## Delivery Constraint

This change is documentation/specification-only. It is planned as one PR under the approved `99,999` authored-line maintainer exception; it MUST NOT modify application code or clean unrelated dirty worktree changes.
