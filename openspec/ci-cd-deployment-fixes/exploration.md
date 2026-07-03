# Exploration: CI/CD & Deployment Fixes (`ci-cd-deployment-fixes`)

This document presents a comprehensive analysis and diagnosis of all issues preventing successful CI/CD execution and deployment to production.

---

## 1. GitHub Workflows (`.github/workflows/security.yml`)

### A. TruffleHog "BASE and HEAD commits are the same" Error
* **Cause**: In `security.yml`, TruffleHog is configured with `base: ${{ github.event.repository.default_branch }}` and `head: HEAD`. On a `push` event directly to the default branch (`main`), the base and head commits are identical, causing TruffleHog to crash with a fatal error.
* **Recommendations**:
  1. Modify the workflow to conditionally define the scan range based on the event trigger:
     - For **Pull Requests**: Use `base: ${{ github.event.pull_request.base.sha }}` and `head: ${{ github.event.pull_request.head.sha }}`.
     - For **Pushes**: Scan only the pushed range using `base: ${{ github.event.before }}` and `head: ${{ github.event.after }}` (or omit `base` entirely to perform a full commit scan of the current branch state).
  2. Implement split steps for PR vs. Push triggers to isolate the configurations cleanly.

### B. `pnpm audit` Failures (Vulnerabilities in `postcss` and `turbo`)
* **Cause**: Nested transitive dependencies use older, vulnerable versions of `postcss`, and the root monorepo locks `turbo` to version `^1.12.5` which contains security vulnerabilities.
* **Recommendations**:
  1. **postcss**: Add a `pnpm.overrides` configuration block in the root `package.json` to force sub-dependencies to resolve to a secure version of `postcss` (e.g., `^8.4.43` or higher).
  2. **turbo**: Upgrade the root `turbo` dependency to a secure, stable version (e.g., `^1.16.15` or `^2.0.0`).

### C. ESLint Triple-Slash Reference Error in `apps/web/next-env.d.ts`
* **Cause**: Next.js automatically generates `apps/web/next-env.d.ts` using triple-slash reference syntax (`/// <reference types="next" />`). However, the standard `@typescript-eslint/recommended` ruleset bans triple-slash references.
* **Recommendations**:
  1. Update `apps/web/.eslintrc.json` to include `"next-env.d.ts"` in its `ignorePatterns` block, since this file is managed by Next.js and should not be modified manually:
     ```json
     "ignorePatterns": ["next-env.d.ts"]
     ```

---

## 2. Render Build Failure (`turbo.json` & Build Commands)

### A. Turbo Config Pipeline vs. Tasks
* **Analysis**: If `turbo` is upgraded to `2.x`, we should migrate `"pipeline"` to `"tasks"` in `turbo.json`. If we upgrade to a stable, secure `1.x` version (e.g., `1.16.15`), the current `"pipeline"` key is fully supported.
* **Recommendations**:
  - Upgrade to `turbo@1.16.15` first to preserve existing configuration compatibility, or upgrade to `2.x` and rename `"pipeline"` to `"tasks"` in `turbo.json`.
  - Use `npx turbo` or `pnpm turbo` in Render scripts to guarantee that Render uses the local version of Turborepo instead of expecting a global CLI tool to be installed on the deployment environment.
  - The correct Render build command for deploying the API is:
    ```bash
    pnpm run build --filter=api
    ```

---

## 3. Ingestion and Database Verification

### A. Code Locations
* **Ingestion Endpoint**: `POST /ingest` in `apps/api/src/presentation/routes/hydrology-government.ts` triggers a series of fetch requests to live telemetry sources (`PNA`, `INA`, `INMET`, `SMN`) with an offline-fixture fallback mechanism for tests.
* **Seed Script**: `apps/api/src/scripts/seed-government-hydrology.ts` runs `seedGovernmentMunicipalitiesIfEmpty` to populate PostGIS stations and municipalities with geographic spatial data.

### B. Production Readiness Checklist for Database/Ingestion
* **PostGIS Extension**: Since the seed script runs `CREATE EXTENSION IF NOT EXISTS postgis` and inserts `ST_GeomFromText` boundaries, the production PostgreSQL database **must** support PostGIS and be run with a user that has permission to enable extensions.
* **Connection Pooling**: When deploying the Express API in multi-core Cluster Mode, the pool size should be restricted (e.g., `max: 5` or `max: 10`) to prevent exhaustion of PostgreSQL's server-side connection limits.

---

## 4. Ready for Proposal
**Yes**. The issues have been fully diagnosed and the recommended mitigation paths are straightforward and low-risk. We are ready to proceed with the proposal phase.
