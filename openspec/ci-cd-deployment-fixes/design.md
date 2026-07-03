# Design: CI/CD Deployment Fixes

## Technical Approach

Apply targeted operational fixes without changing product behavior: correct TruffleHog event ranges, make dependency resolution audit-safe, exclude generated Next types from ESLint, migrate Turbo to v2 `tasks`, and document deterministic Neon seed plus ingestion validation commands.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| TruffleHog scan ranges | Split PR and push scan steps with `if: github.event_name == 'pull_request'` / `push`. PR uses `base: ${{ github.event.pull_request.base.sha }}` and `head: ${{ github.event.pull_request.head.sha }}`; push uses `base: ${{ github.event.before }}` and `head: ${{ github.sha }}`. | Single step using `github.event.repository.default_branch`; branch names instead of SHAs. | Current config can scan invalid same/branch refs. Event-specific SHAs are explicit and avoid PR-only fields on push. |
| Root dependency hardening | Upgrade root `turbo` to v2 and add root `pnpm.overrides` for vulnerable transitive `postcss` and `turbo` resolution. | Switch package manager or patch app-local dependencies only. | Keeps existing pnpm workflow and makes audit resolution deterministic at monorepo root. |
| Web ESLint generated-file handling | Add `ignorePatterns: ["next-env.d.ts"]` in `apps/web/.eslintrc.json`; change `apps/web/package.json` lint script from deprecated `next lint` to `eslint . --ext .ts,.tsx --max-warnings 0`. | Ignore all `*.d.ts`; remove Next TypeScript lint extension. | Ignores only generated Next env types while preserving source lint coverage and aligns with existing `lint:security` script shape. |
| Turbo v2 config | Rename top-level `pipeline` to `tasks`, preserve task bodies. Root scripts continue invoking `turbo run ...` so pnpm resolves local binary. | Keep Turbo v1; install global Turbo in CI/Render. | Spec requires v2 compatibility and local tool resolution; config-only migration is lowest risk. |

## Data Flow

```text
GitHub event ──→ security.yml ──→ event-specific TruffleHog range
pnpm install ──→ root package overrides ──→ audit/build/lint
pnpm turbo run ──→ turbo.json tasks ──→ app build/lint/test
Neon env ──→ api seed script ──→ PostGIS tables ──→ POST /api/hydrology/ingest
```

## File Changes

| File | Action | Description |
|---|---|---|
| `package.json` | Modify | Upgrade `devDependencies.turbo` to `^2.x`; add `pnpm.overrides` for secure `postcss` and `turbo`; keep `packageManager: pnpm@9.0.0`. |
| `pnpm-lock.yaml` | Modify | Refresh lockfile after dependency/override changes. |
| `apps/web/.eslintrc.json` | Modify | Add `ignorePatterns` for generated `next-env.d.ts` only. |
| `apps/web/package.json` | Modify | Use direct ESLint command for `lint`, matching security lint behavior. |
| `.github/workflows/security.yml` | Modify | Replace single TruffleHog step with PR and push steps using event-specific SHA refs; keep `fetch-depth: 0`. |
| `turbo.json` | Modify | Replace `pipeline` with `tasks`; preserve `build`, `dev`, `lint`, `lint:security`, `test`, and `clean` settings. |

## Interfaces / Contracts

No runtime API contracts change. Operational command contracts:

```bash
pnpm install
pnpm audit --audit-level=moderate
pnpm run lint:security
pnpm run build
```

Seed and ingestion validation must run with production-like Neon/PostGIS variables available to `apps/api` (`DATABASE_URL` at minimum):

```bash
pnpm --filter api run seed:government-hydrology
pnpm --filter api run build
pnpm --filter api run start
curl -X POST "$API_BASE_URL/api/hydrology/ingest" \
  -H "Content-Type: application/json" \
  -d '{"reason":"deployment-validation"}'
```

Expected evidence: seed logs `Government hydrology municipality seed completed`; ingestion returns HTTP `202` with `contractVersion: hydrology-government-ingest-v1`, `status: completed`, and sources. If testing one source, send `{"source":"PNA","reason":"deployment-validation"}`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Config | Turbo v2 schema and local binary resolution | `pnpm run build`, `pnpm run lint` after install. |
| Security CI | TruffleHog PR and push input correctness | Inspect workflow syntax; verify on PR and push runs. |
| Dependency | Targeted advisories resolved | `pnpm audit --audit-level=moderate`. |
| Integration | Neon seed and hydrology ingestion | Run seed command, start API, POST `/api/hydrology/ingest`, confirm persisted telemetry/municipality rows. |

## Migration / Rollout

No data migration is required. Roll out as one CI/config change, then run deployment validation against Neon before marking deployment successful. Rollback by reverting package/lockfile/workflow/Turbo/ESLint changes; delete only validation rows if bad operational data was inserted.

## Open Questions

None.
