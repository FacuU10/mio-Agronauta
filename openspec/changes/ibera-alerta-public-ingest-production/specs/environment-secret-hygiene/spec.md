# environment-secret-hygiene Specification

## Purpose

Prevent environment-secret files from being committed while retaining safe templates.

## Requirements

### Requirement: Environment-file ignore policy

The repository MUST ignore `.env`, `.env.*`, `*.env`, and `*.env.*`. It MUST explicitly preserve `!*.env.example` so safe example templates remain trackable. Example files MUST NOT contain live secrets.

#### Scenario: Secret environment variant

- GIVEN a new `.env.production` or `service.env.local` file
- WHEN Git evaluates ignore rules
- THEN the file is ignored

#### Scenario: Safe example template

- GIVEN `service.env.example` contains placeholders only
- WHEN Git evaluates ignore rules
- THEN the file remains eligible for tracking

### Requirement: Secret exposure audit

Before deployment, delivery MUST audit tracked secret-like files and staged changes without printing secret values. It MUST fail or remediate any tracked live credential, and MUST record only file paths, classifications, and remediation status.

#### Scenario: Audit detects a tracked credential

- GIVEN a tracked file is classified as containing a live credential
- WHEN the audit runs
- THEN delivery is blocked until it is removed or remediated without value disclosure

#### Scenario: Audit finds no live credentials

- GIVEN tracked candidates contain only placeholders or no credentials
- WHEN the audit runs
- THEN it records a redacted passing result

## Non-Goals

This capability does not rotate, reveal, or store production secret values.
