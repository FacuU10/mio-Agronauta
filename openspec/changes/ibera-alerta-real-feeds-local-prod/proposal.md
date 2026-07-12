# Proposal: Iberá Alerta Real Feeds Local Production Launch

## Intent

Ship a practical immediate hydrology launch path: local backend code writes to the production DB using real official sources, prioritizing PNA successful ingestion and honest degraded diagnostics for sources that cannot safely provide parseable data. Timeout-only is rejected because PNA default 504s at ~32s, while the runner currently caps sources at 12s.

## Scope

### In Scope
- Make PNA ingest real records from `https://contenidosweb.prefecturanaval.gob.ar/alturas/` via bounded HTML table parsing.
- Align source runner timeout with source timeout budgets, capped and single-attempt/no-retry.
- Move INMET to `https://apitempo.inmet.gov.br/estacoes/T` plus station-day reads; treat `204` as empty/degraded.
- For INA/SMN, implement only verified feasible HTML/API parsing; otherwise return explicit degraded diagnostics and preserve old data.
- Extend local all-source API verifier expectation: HTTP `202`, valid contract, and at least PNA inserted records when PNA parser works.

### Out of Scope
- Cloudflare bypassing, retry loops, polling, fake fixture success, or unbounded scraping.
- Full SMN alerts ingestion unless an official JSON alerts feed is verified.
- Production deployment itself; this change prepares deployable proof.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `ibera-alerta`: Real official-feed ingest must prefer successful PNA ingestion, bounded execution, explicit source degradation, and local-real verifier proof before deploy.

## Approach

Default PNA URL to the fast `contenidosweb` endpoint and add a robust parser for its real table shape mapped to existing municipalities/gauges. Configure the runner deadline from requested source/client timeouts with a conservative max, preserving one network attempt per source and no retries. Replace INMET portal JSON assumptions with the `apitempo` station catalog/day endpoint and handle no-content as `empty`. Keep INA/SMN honest: parse inspected official samples only if stable enough; otherwise return safe `failed`/`empty` diagnostics with provenance and leave previous DB data intact.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `packages/hydrology-engine/src/clients/http-clients.ts` | Modified | Official URLs, per-source fetch behavior, timeout diagnostics. |
| `packages/hydrology-engine/src/adapters/*-adapter.ts` | Modified | PNA HTML, INMET API/204, INA/SMN parser-or-degraded behavior. |
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modified | Runner timeout alignment and preserved independent source results. |
| `apps/api/src/scripts/verify-hydrology-local-real.ts` | Modified | Assert all-source HTTP 202 and PNA inserts when parser succeeds. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---:|---|
| Official HTML changes | Med | Parser tests, source-level failure, preserved old data. |
| Runner exceeds infra limits | Med | Conservative cap, one attempt, no retries. |
| INA/SMN remain unavailable | High | Explicit degraded diagnostics, no fake success. |

## Rollback Plan

Revert provider URL/parser changes and runner timeout configuration; redeploy previous safe-degradation ingest. Existing telemetry remains preserved because no fixture overwrite is introduced.

## Dependencies

- Production DB credentials for local verifier.
- Official public source availability during one-shot verification.

## Success Criteria

- [ ] Local all-source verifier returns HTTP `202` with valid ingest contract.
- [ ] PNA inserts real records from the fast HTML endpoint when available.
- [ ] INMET `204` is reported as `empty`/degraded, not a crash.
- [ ] INA/SMN never report fake success and preserve existing data.
