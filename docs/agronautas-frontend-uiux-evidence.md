# Agronautas Frontend Demo and UI/UX Evidence

Use the local demo as the required, quickest safe way to visually try every frontend flow. It starts only the web app and does not require or mutate an API or database.

## Quick Demo

1. Install workspace dependencies once with `pnpm install`.
2. Run `pnpm run demo:local` from the repository root.
3. Open `http://localhost:3000/demo`.

The workspace displays `DEMO LOCAL · SIN PERSISTENCIA`. Deterministic browser-side fixtures expose the frontend flows; mutations stay in memory and reset on reload. The demo is not a database seed and makes zero API writes. The command never starts a database, runs migrations, or invokes a seed. Keep the DEMO label visible when sharing screenshots or walkthroughs.

## Focused Browser Evidence

Run the evidence contract test and desktop/mobile browser proof:

```bash
pnpm --dir apps/web exec node --import tsx --test src/lib/uiux-evidence.test.ts
pnpm --dir apps/web test:e2e --grep uiux-evidence
```

When `PLAYWRIGHT_BASE_URL` is not set, Playwright starts and stops its configured temporary API/web harness. The evidence spec visits `/demo`; that route uses its browser fixture and the evidence report records zero API requests. The report and screenshot are attached to the Playwright result. The structured report contains the route path (without query or fragment), viewport, observed mode, provenance/freshness visibility, categorized blockers, error/request counts, and screenshot status. It does not store raw console/network text, query parameters, credentials, commit hashes, or production claims. Commit identity is `not-supplied`; production evidence is `N/A`.

The envelope permits `demo`, `local-real`, and `blocked` observations. This focused run proves only the local demo browser path. Mark a separate run `local-real` only when it actually exercised the configured local API with real service data; record unavailable prerequisites as blocker categories rather than converting them to success.

## Local-Real Prerequisites

Local-real API/runtime instructions already exist in [`apps/web/tests/e2e/README.md`](../apps/web/tests/e2e/README.md). This optional path is separate from `pnpm run demo:local`: it requires separately available API and web services, and the capabilities under test may require Postgres/PostGIS, Redis, a worker, an authorized authenticated session, and provider access. Follow that runbook for its readiness and browser commands; explicitly invoke any setup, migration, or seed required there. Local-real results must come from real service data and remain distinct from browser-demo evidence. Do not paste `.env` contents into commands, reports, screenshots, or logs.

Neither local demo nor local-real evidence is production evidence. Production remains `N/A` unless independently supplied evidence is reviewed and recorded outside this browser-fixture run.
