# Production Readiness Specification

## Purpose

Define launch-blocking behavior for image-test compatibility, PostgreSQL pool safety, and operational health/readiness gates for `mvp-production-launch`.

## Requirements

### Requirement: Next.js 15 Landing Image Test Compatibility

`apps/web/src/components/landing/homepage.test.tsx` MUST pass when Next.js/JSDOM emits optimized image `src` values containing either plain `/` path separators or URL-encoded `%2F` separators. The test MUST verify the intended image asset without coupling to one encoding form.

#### Scenario: Encoded image URL is accepted
- GIVEN the landing homepage renders an image whose `src` includes an encoded path such as `%2Fagronautas%2Fhero.jpg`
- WHEN the homepage test asserts the hero image source
- THEN the assertion MUST pass
- AND it MUST still prove the expected asset path/name is present.

#### Scenario: Plain image URL remains accepted
- GIVEN the landing homepage renders an image whose `src` includes plain separators such as `/agronautas/hero.jpg`
- WHEN the homepage test asserts the hero image source
- THEN the assertion MUST pass without weakening the test to a generic image-only check.

### Requirement: Cluster-Safe PostgreSQL Pool Sizing

`apps/api/src/infrastructure/database/postgres/pool.ts` MUST expose a deterministic PostgreSQL pool maximum per cluster worker. The per-worker pool size MUST be computed exactly as `Math.max(5, Math.floor((process.env.DATABASE_POOL_MAX ? parseInt(process.env.DATABASE_POOL_MAX, 10) : 20) / numWorkers))`, where `numWorkers` is the number of spawned cluster workers and `DATABASE_POOL_MAX` is the env var override. Invalid or non-positive computed values MUST fall back to the same formula with the base value `20`.

#### Scenario: Explicit pool override is divided per worker
- GIVEN `DATABASE_POOL_MAX=12` and `numWorkers=3`
- WHEN the PostgreSQL pool is created
- THEN the pool max MUST be `Math.max(5, Math.floor(12 / 3))`, which is `5`.

#### Scenario: Default pool budget is divided per worker
- GIVEN no `DATABASE_POOL_MAX` and `numWorkers=4`
- WHEN pool max is computed
- THEN the pool max MUST be `Math.max(5, Math.floor(20 / 4))`, which is `5`.

#### Scenario: Single worker receives default budget
- GIVEN no `DATABASE_POOL_MAX` and `numWorkers=1`
- WHEN pool max is computed
- THEN the pool max MUST be `20`.

### Requirement: Health and Readiness Dependency Semantics

`GET /health` MUST remain lightweight liveness and MUST return `HTTP 200 OK` without requiring PostgreSQL, Redis, or Mongo success. `GET /ready` MUST validate required PostgreSQL and Redis dependencies before reporting ready. PostgreSQL and Redis dependency checks MUST each have a hard timeout limit of `2000ms`. MongoDB MUST be optional: failure MAY appear as degraded metadata but MUST NOT by itself make readiness fail.

#### Scenario: Health succeeds independently
- GIVEN PostgreSQL, Redis, or Mongo are unavailable
- WHEN `GET /health` is requested
- THEN the API MUST return `HTTP 200 OK`
- AND the response MUST NOT be used as dependency readiness proof.

#### Scenario: Ready succeeds with required dependencies healthy
- GIVEN PostgreSQL and Redis checks complete successfully within `2000ms`
- AND Mongo is unavailable or unconfigured
- WHEN `GET /ready` is requested
- THEN the API MUST return `HTTP 200 OK`
- AND the response SHOULD mark Mongo as optional/degraded when applicable.

#### Scenario: Ready fails when a required dependency fails or times out
- GIVEN PostgreSQL or Redis fails or exceeds the `2000ms` hard timeout
- WHEN `GET /ready` is requested
- THEN the API MUST return `HTTP 503 Service Unavailable`
- AND the payload MUST identify the failing required dependency.

## Verification

- Web: run the focused homepage component test and confirm encoded/plain image paths pass.
- API: run focused pool tests covering override division, default division, and single-worker default.
- API: run health/readiness route tests covering `HTTP 200 OK`, `HTTP 503 Service Unavailable`, and `2000ms` dependency timeouts.
