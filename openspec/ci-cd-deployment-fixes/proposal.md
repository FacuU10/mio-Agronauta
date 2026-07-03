# Proposal: CI/CD Deployment Fixes

## Intent

Make CI, security checks, Render builds, and production ingestion reliable by fixing known workflow, audit, Turbo, ESLint, and Neon/PostGIS deployment blockers.

## Scope

### In Scope
- Fix `.github/workflows/security.yml` TruffleHog scan ranges for PR and push events.
- Add root `package.json` `pnpm.overrides` for vulnerable `postcss` and upgrade/override `turbo`.
- Ignore generated `apps/web/next-env.d.ts` in web ESLint config.
- Migrate `turbo.json` from `pipeline` to `tasks` and ensure CI/Render uses local Turbo.
- Run database seeding and test `POST /ingest`, storing successful results in Neontech/Neon.

### Out of Scope
- Redesigning CI/CD topology beyond failing checks.
- Reworking ingestion business logic or source adapters.
- Changing production hosting provider or database vendor.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None — this is operational/configuration hardening, not a user-facing requirement change.

## Approach

Apply targeted config fixes: split TruffleHog behavior by GitHub event SHA range, pin/upgrade vulnerable packages through pnpm lockfile-compatible changes, ignore Next-generated env types, upgrade Turbo and rename `pipeline` to `tasks`, then validate Render/CI build commands and run seed plus ingestion against Neon with recorded evidence.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.github/workflows/security.yml` | Modified | Correct TruffleHog base/head inputs. |
| `package.json`, lockfile | Modified | Add pnpm overrides and Turbo upgrade. |
| `apps/web/.eslintrc.json` | Modified | Ignore generated `next-env.d.ts`. |
| `turbo.json` | Modified | Use Turbo v2 `tasks` schema. |
| `apps/api/src/scripts/seed-government-hydrology.ts` | Used | Run seed against Neon/PostGIS. |
| `apps/api/src/presentation/routes/hydrology-government.ts` | Used | Validate `POST /ingest`. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Turbo v2 changes break scripts | Med | Run local CI/build commands before deploy. |
| Neon lacks PostGIS permissions | Med | Confirm extension creation or pre-enable PostGIS. |
| Audit override masks incompatible dependency | Low | Use secure compatible versions and run tests. |

## Rollback Plan

Revert workflow/config/package changes and lockfile as one commit. If Neon seed/ingest creates bad data, restore from Neon backup or delete seeded ingestion rows using timestamp/source filters.

## Dependencies

- GitHub Actions, pnpm, Turbo v2-compatible config, Render build environment, Neon database with PostGIS.

## Success Criteria

- [ ] Security workflow passes for PR and push events.
- [ ] `pnpm audit` no longer fails on `postcss` or `turbo` findings.
- [ ] Web lint ignores `next-env.d.ts` without suppressing app source linting.
- [ ] Render/CI build runs with local Turbo and `tasks` config.
- [ ] Seed and `POST /ingest` succeed and persist expected records in Neon.
