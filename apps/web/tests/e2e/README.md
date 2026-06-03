# Agronautas Playwright verify

- Materialize workspace dependencies with `pnpm install`.
- Install the browser once with `pnpm --filter web exec playwright install chromium`.
- Run the smoke verify with `pnpm --filter web test:e2e`.
- For verify-grade production runs, prefer `pnpm --filter web build` and let Playwright boot `pnpm start` through `playwright.config.mjs`.
- The smoke spec `tests/e2e/agronautas-smoke.spec.js` uses network stubs, so it validates the stale/evidence UI flow even before a full API-backed E2E stack exists.
