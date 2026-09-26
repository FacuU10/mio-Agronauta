# Frontend Demo and Evidence Specification

## Purpose

Make local demonstration states deterministic, reproducible, and attributable while keeping demo evidence separate from live and production claims.

## Requirements

### Requirement: Browser demo fixtures are deterministic and bounded

The required, safe local preview MUST use deterministic browser-side fixtures to make every frontend flow visually explorable through the single command `pnpm run demo:local`. The fixtures MUST use stable identifiers, relationships, timestamps, statuses, provenance, and empty/error/degraded states for Agronautas, marketplace, and government views. Demo mutations MUST remain in browser memory, reset on reload, display an explicit DEMO label, and produce zero API writes. This preview MUST NOT require or mutate a database.

#### Scenario: Fresh local demo is reproducible
- GIVEN workspace dependencies are installed
- WHEN the operator runs `pnpm run demo:local` and opens `/demo`
- THEN every frontend flow is available from deterministic fixtures with stable identifiers and evidence modes, an explicit DEMO label, and no API writes

#### Scenario: Demo changes reset on reload
- GIVEN the operator changes demo state in the browser
- WHEN the page is reloaded
- THEN the original deterministic fixture is restored and no server-side or database mutation exists

### Requirement: Local-real setup remains optional and separate

Database-backed local-real setup MAY be used separately when a capability requires real service data. Its prerequisites, environment preparation, auth/bootstrap, any required migrations or seed commands, service startup, and verification MUST be documented independently from `pnpm run demo:local`. Neither the demo command nor the browser-demo verification path may automatically start or invoke a database, migration, or seed. The local-real setup MUST retain its own evidence classification and MUST NOT be replaced by browser-fixture evidence.

#### Scenario: Operator starts the demo
- GIVEN workspace dependencies are installed
- WHEN the operator runs `pnpm run demo:local`
- THEN only the web app starts, the browser fixtures are available, and the experience is labeled as non-persistent demo data

#### Scenario: Local-real prerequisites are unavailable
- GIVEN a separate local-real run requires a database, provider, worker, or authorized session that is unavailable
- WHEN local-real verification is attempted
- THEN the missing prerequisite and affected capability are recorded as blocked/unavailable and no local-real evidence is claimed

### Requirement: Evidence attribution is machine-readable

Demo and browser evidence MUST record environment, worktree/commit identity, route, viewport, data mode, provenance, freshness, expected service boundary, result, and blocker classification. Reports MUST keep stubbed/demo, local-real, managed-harness, blocked, and production evidence in separate sections.

#### Scenario: Demo evidence is exported
- GIVEN a route reaches a deterministic demo state
- WHEN browser evidence is saved
- THEN a reviewer can identify the fixture mode and reproduce the result without mistaking it for production

#### Scenario: Production proof is requested
- GIVEN this change has only local, stubbed, or blocked evidence
- WHEN a summary is generated
- THEN it explicitly excludes Gate G and lists the missing external prerequisites
