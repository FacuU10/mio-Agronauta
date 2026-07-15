# Tasks: Agronautas Production Readiness Launch

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

| Field | Value |
|---|---|
| Estimated changed lines | ~350-450 lines |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Slice 1-2 base) -> PR 2 (Slice 3) -> PR 3 (Slice 4) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Baseline Security, Migrations & Worker Core | PR 1 | Target: feature/tracker branch. Pre-cambios backup, config validation, queue heartbeat |
| 2 | Provider Truth & Production DB Smoke Proof | PR 2 | Target: PR 1 branch. ProviderEvidencePort and UI degradation with live DB verification |
| 3 | Production Merge & Live Endpoint Proof | PR 3 | Target: main. Merge to main, wait 2m, ping www.agronauta.com.ar, post-cambios backup |

---

## Phase 1: Environment, Secrets & DB Reproducibility (Slice 1 & 2)
- [ ] 1.1 Isolate dirty states: stash or discard `.atl/skill-registry.md` and `openspec/.../verify-report.md`.
- [ ] 1.2 Git Backup: Create and push `pre-cambios` branch.
- [ ] 1.3 Rotate exposed secrets in `.env` and create updated `.env.example`.
- [ ] 1.4 Setup `.gitleaks.toml` and `.github/workflows/security.yml` to reject exposed secrets.
- [ ] 1.5 Create `docs/runbooks/agronautas-production-hardening.md` with environment manifest verification steps.
- [ ] 1.6 **RED**: Run unit tests expecting failures for missing production environment variables.
- [ ] 1.7 **GREEN**: Add `ProductionEnvValidatorPort` inside `apps/api/src/infrastructure/config/validator.ts` to validate required variables.
- [ ] 1.8 Update `apps/api/Dockerfile` and `docker-compose.yml` to run Prisma migrations deploy on release/startup.
- [ ] 1.9 Create Redis/Postgres-backed `SchedulerWindowLockPort` lock adapter in `apps/api/src/infrastructure/database/redis/scheduler-lock.ts`.
- [ ] 1.10 Modify API index to enforce lock on queue producers and schedulers.
- [ ] 1.11 Update `apps/workflow-runtime-python/Dockerfile` entrypoint and implement Python queue consumer in `src/worker/queue/consumer.py`.
- [ ] 1.12 **Verify with Production DB**: Run local backend code connected to the real production database to verify migration schema match, active jobs, and scheduler locks, producing actual endpoint evidence.

## Phase 2: Provider-Truth UI & Integration (Slice 3)
- [ ] 2.1 Implement `ProviderEvidencePort` in `apps/api/src/infrastructure/config/provider-matrix.ts` tracking `live|seam|mock|unavailable` state.
- [ ] 2.2 Update UI in `apps/web/src/components/agronautas/*` to display degraded status based on provider state.
- [ ] 2.3 **RED**: Inject slow/unreachable provider status; expect stale UI/live flags to fail.
- [ ] 2.4 **GREEN**: Connect truth evidence to frontend display. Verify mock-over-live prevention works. Run Jest and Pytest.
- [ ] 2.5 **Verify with Production DB**: Run local frontend and backend code targeting the real production database, verifying browser-end integration and truth degradation copy to record actual endpoint evidence in `artifacts/`.

## Phase 3: Production Launch & Live Proof (Slice 4)
- [ ] 3.1 Create `docs/runbooks/agronautas-release.md` and define rollback runbook to safely disable writes while keeping read-only access.
- [ ] 3.2 Merge implementation branches to `main`.
- [ ] 3.3 **Deploy & Propagate**: Wait exactly 2 minutes for deployment propagation.
- [ ] 3.4 **Production Verification**: Run real runtime ping/endpoint checks against `www.agronauta.com.ar` to produce the final `post-cambios` launch evidence.
- [ ] 3.5 Git Backup: Commit and push the updated files to a `post-cambios` branch.
