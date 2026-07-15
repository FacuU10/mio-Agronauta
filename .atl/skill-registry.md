# Skill Registry — monorepo-js-baseline

Generated: 2026-07-13  
Project: `C:\Users\mmmau\Agronautas\monorepo-js-baseline`  
Mode: hybrid SDD persistence (`openspec/config.yaml` + Engram)

## Project standards

- Use `C:\Users\mmmau\.config\opencode\skills\_shared\global-mindset.md` for all SDD phases.
- Strict TDD is enabled; planning and apply artifacts must preserve RED-GREEN-REFACTOR evidence.
- Do not modify application code directly from raw requests; establish SDD intent/scope/risk first.
- Keep UI dumb: UI renders state and intent; durable business rules and orchestration belong in backend/application/domain modules.
- Favor clean/hexagonal boundaries, explicit ports/adapters, observability, idempotency, traceability, and rollback.

## Applicable compact skill rules

### sdd-init
- Detect actual stack, tests, conventions, and persistence from repo files; never guess.
- Hybrid mode writes OpenSpec artifacts and Engram observations.
- Persist project context separately from testing capabilities.
- Always build `.atl/skill-registry.md` and save registry to Engram when available.
- Automated SDD/config saves use `capture_prompt:false`.

### sdd-explore / sdd-propose / sdd-spec / sdd-design / sdd-tasks / sdd-apply / sdd-verify / sdd-archive
- Follow SDD DAG: explore → proposal → iron-po → specs/design → iron-qa/iron-arch → tasks → iron-tasks → apply → verify → archive.
- Store hybrid artifacts under `openspec/changes/{change-name}/` and matching Engram topic keys.
- Use `openspec/config.yaml` rules as the local source for strict TDD and verification commands.
- Keep artifacts recoverable with stable paths and topic keys.
- Archive by moving completed changes under `openspec/changes/archive/YYYY-MM-DD-{change-name}/` and preserving audit trail.

### iron-po / iron-qa / iron-arch / iron-tasks
- Iron gates are mandatory where the DAG requires them.
- `BLOCKER` halts progression; `RISK` requires captured mitigation; `NITPICK` is non-blocking follow-up; `PASS` proceeds.
- Findings must cite specific artifact, requirement, code path, scenario, or task evidence.
- Keep reviews zero-fluff: verdict, evidence, risk, concrete fix.

### nextjs-15
- Use App Router conventions and verify async server APIs/current Next behavior from project files or docs when exact syntax matters.
- Keep server/client boundaries explicit; avoid moving backend decisions into React components.
- Validate builds with `pnpm --dir apps/web build` or root `pnpm build` when web behavior changes.

### react-19
- Prefer straightforward components; React Compiler reduces need for defensive memoization.
- Keep component state local and narrow; move durable business logic out of UI.
- Validate interactive UI with unit tests and Playwright when behavior changes.

### tailwind-4
- Use Tailwind 4 project conventions and avoid inventing legacy config patterns.
- Keep utility composition readable; use existing `clsx`/`tailwind-merge` patterns where present.
- Validate styling-sensitive UI through screenshots or E2E when risk is visual/regression-prone.

### playwright
- Prefer role/text/test-id selectors over brittle DOM selectors.
- Use Playwright for full user journeys and web E2E gates via `pnpm --dir apps/web test:e2e`.
- Keep tests deterministic and isolate external network/data dependencies.

### typescript
- Preserve strict, typed package boundaries across apps and shared packages.
- Avoid `any` and unsafe casts unless contained with rationale.
- Validate type safety through package builds or root `pnpm build`.

### zustand-5
- Keep stores small, UI-facing, and replaceable; do not embed durable domain rules in client store.
- Prefer selector-based subscriptions and simple state transitions.

### pytest
- Python worker tests use pytest after `pnpm worker:install` or editable install with dev extras.
- Keep fixtures explicit and avoid test order coupling.
- Ruff and mypy are available through worker dev extras.

## Detected commands

- Install: `pnpm install`; worker dev install: `pnpm worker:install`
- Dev: `pnpm dev`
- Build: `pnpm build`
- Test: `pnpm test`
- Web unit: `pnpm --dir apps/web test`
- Web E2E: `pnpm --dir apps/web test:e2e`
- API test: `pnpm --dir apps/api test`
- Hydrology test: `pnpm --dir packages/hydrology-engine test`
- Contracts: `pnpm --dir packages/contracts test:agronautas-contracts`, `validate:schemas`, `validate:agronautas-schema`
- Worker tests: `pytest apps/workflow-runtime-python`
- Lint/security: `pnpm lint`; `pnpm lint:security`
- Format: `pnpm format`
