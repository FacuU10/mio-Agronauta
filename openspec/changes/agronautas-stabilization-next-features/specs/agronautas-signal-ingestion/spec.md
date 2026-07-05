# Delta for Agronautas Signal Ingestion

## ADDED Requirements

### Requirement: Truthful Provider Claims
The system MUST classify each provider claim as `live`, `seam`, `mock`, or `unavailable` and persist evidence for the classification.

#### Scenario: Mock cannot appear live
- GIVEN a provider returns fixture or test data
- WHEN ingestion status and dashboard payloads are built
- THEN the provider is labeled `mock` or `seam`
- AND no UI or report claims it is live

#### Scenario: Unavailable source remains visible
- GIVEN a provider has no successful current or latest-good evidence
- WHEN ingestion completes
- THEN status is `unavailable` with failure reason and next retry

### Requirement: Persisted Cadence Due Selection
The scheduler MUST use persisted per-source cadence and expose next-due state for every source.

#### Scenario: Per-source due windows differ
- GIVEN hourly weather and weekly satellite cadence are persisted
- WHEN the scheduler ticks
- THEN only due sources run
- AND skipped sources expose their next-due timestamp

#### Scenario: Restart keeps cadence
- GIVEN cadence records exist and the service restarts
- WHEN the first scheduler tick runs
- THEN due selection matches persisted cadence without manual in-memory setup

### Requirement: Extended Provider Backoff
The scheduler MUST protect national providers by using waits of 45 seconds, 5 minutes, 10 minutes, and 15 minutes for attempts 1 through 4, then desisting until the next scheduled hourly run if failure persists.

#### Scenario: Provider retries follow approved window
- GIVEN an ingestion source fails repeatedly
- WHEN attempts 1 through 4 are planned
- THEN waits are 45s, 5m, 10m, and 15m in order

#### Scenario: Exhausted retries wait for hourly schedule
- GIVEN the fourth attempt still fails
- WHEN the retry controller evaluates another run
- THEN it MUST NOT retry until the next scheduled hourly run
