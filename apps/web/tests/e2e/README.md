# Agronautas Playwright verify

- Materialize workspace dependencies with `pnpm install`.
- Install the browser once with `pnpm --filter web exec playwright install chromium`.
- Run the smoke verify with `pnpm --filter web test:e2e`.
- For verify-grade production runs, prefer `pnpm --filter web build` and let Playwright boot `pnpm start` through `playwright.config.mjs`.
- The smoke specs remain supplemental and still use network stubs; the release gate for Slice 3 is the API/readiness coverage plus the reproducible Compose stack, not stub-only browser traffic.
