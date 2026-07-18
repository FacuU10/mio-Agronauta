# Proposal: Iberá Alerta Production Completion

## Intent

Make persisted SMN/INMET alerts useful by municipality and prove production paths. Dynamic `alert-*` IDs cannot use static mappings; receipts for chat, Cron ingest, Render, and regional access are missing.

## Scope

### In Scope
- Durable coverage-to-municipality association and current-alert rendering in overview/detail.
- Evidence for chat AI, authenticated all-source ingest, Render Cron/configuration, and regional runner/proxy.
- Strict TDD and bounded local/production receipts per slice.

### Out of Scope
- Historical timeline or long-range forecast detail at `/municipalities/:id`, unless already proven by real contracts/data.
- Dynamic alert-ID mapping, provider expansion, UI rewrite, or new infrastructure beyond configured runner/proxy.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `ibera-alerta`: add durable municipal official-alert association, canonical alert rendering, and production-operability requirements.

## Approach

Keep coverage decisions in persistence/application services. Add `municipality_alert_coverage` (`municipalityId`, source, officialCoverageKey, active); query current alerts by coverage, not alert ID. Extend canonical overview/dashboard with distinct `officialAlerts[]`; retain telemetry/provenance. Server Components fetch; views only render state.

| Slice | Contract / evidence | Release gate |
|---|---|---|
| A1 association | Migration, idempotent seed, coverage query | RED/GREEN + rollback test |
| A2 experience | `officialAlerts[]`, overview/detail rendering | Contract + Playwright empty/current alert |
| B1 ingest | Authenticated independent-source route; Cron-only trigger | One authorized receipt; no worker scheduler |
| B2 production | Render config, regional path, chat stream | Redacted inventory + one bounded response/path |

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `packages/hydrology-engine/src/repository.ts` | Modified | Coverage and projection |
| `apps/api` hydrology routes | Modified | Contract and Cron ingress |
| `apps/web` municipalities views/proxy | Modified | Alert rendering |
| Render service/Cron config | Modified | Operator configuration |

## Risks and Controls

| Risk | Control |
|---|---|
| Wrong coverage | Reviewable, versioned seed; display provenance |
| Duplicate ingest | Disable clustered scheduler; one authenticated Cron |
| Geo-block/AI degradation | Explicit degraded state; no fabricated data |

## Rollback Plan

Use additive fields. Revert UI/API/projection while retaining telemetry; disable coverage query before migration reversal. Disable Cron or runner/proxy independently; preserve last-known data and chat fallback.

## Operator Prerequisites and Receipt Discipline

Operators provide Render secrets, Cron header, origins, Groq credentials, and runner/proxy allowlist. Each receipt records redacted revision/config, request ID, source, status, and response shape—never secrets or repeated probes.

## Success Criteria

- [ ] Matching municipalities show current SMN/INMET alerts; unrelated ones do not.
- [ ] PNA/INA and no-data behavior remains intact.
- [ ] Every B path has bounded local/production evidence; Cron runs once/schedule.
- [ ] RED-GREEN evidence, build, contracts, and smoke pass per slice.
