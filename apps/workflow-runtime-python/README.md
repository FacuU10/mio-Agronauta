# workflow-runtime-python

Python runtime slice for workflow execution (including LangGraph-based workers) in the baseline monorepo template.

## Runtime standard

- **Official standard**: LangGraph worker runtime is **Python**.
- **Deferred**: a TS/JS LangGraph runtime slice is intentionally deferred to a future SDD phase.

This keeps runtime responsibilities explicit:

- `apps/api` (TS/JS): API edge + CQRS command/query orchestration.
- `apps/workflow-runtime-python` (Python): workflow execution worker.

## Hosting boundary prerequisite

The Python worker requires **separate hosting** from the Native Node services in
`render.yaml`. The manifest now contains an explicit `agronautas-runtime-worker`
service with the local package install and `workflow-runtime-consumer` command;
the manifest is configuration only and is not deployment, heartbeat, queue, or
provider proof.
Before enabling production recompute, an approved worker host must provide the
Python process, PostgreSQL, Redis, provider configuration, and the additive
Agronautas runtime migration. This documentation and the Render service
definition are prerequisites, not live deployment evidence.

## JSON Schema bridge (cross-runtime contract)

The TS/JS API and Python worker communicate through shared JSON Schema contracts in `packages/contracts/schemas`.

Contract flow:

1. API edge validates payloads/events against JSON Schema.
2. Serialized contract messages are handed to workflow runtime boundaries.
3. Python worker validates the same schema contract before execution.

This provides:

- language-neutral interoperability (TS/JS ↔ Python),
- consistent versioned contracts across services,
- safe runtime evolution without coupling business workflow logic to one language stack.

When the worker is installed as a wheel, the runtime schemas required for the
worker envelope are bundled under `worker/schema` and used automatically when
the monorepo `packages/contracts/schemas` directory is not available. Set
`WORKER_CONTRACTS_ROOT` only when an explicitly managed schema directory should
override that packaged fallback; relative `$ref` targets are registered before
payload validation.

## Why Python is the standard

Python is the default worker runtime because the current design explicitly mandates LangGraph on Python for the workflow executor. That choice keeps the baseline aligned with the design artifact and avoids pretending the TS/JS runtime parity already exists.

## Deferred TS/JS runtime

The TypeScript/JavaScript LangGraph worker is intentionally deferred. The baseline keeps the cross-runtime seam ready through JSON Schema contracts, but it does not ship a fake TS/JS worker implementation in this phase.

## Minimal local run

```bash
# from monorepo root: install the package and its test extras
pnpm worker:install
pnpm worker:test

# start the worker only when authorized Postgres/Redis are available
pnpm worker:run
```

Or via npm scripts:

```bash
pnpm run worker:install
pnpm run worker:test
pnpm run worker:run
```

The equivalent package-local commands are `python -m pip install -e ".[dev]"`
and `python -m pytest tests -q` from `apps/workflow-runtime-python`. The runtime
harness uses that same package-local pytest command; if Python or pytest is not
available it records `worker_tests: unavailable` and never reports a historical
pass.

### Windows psycopg event-loop boundary

On Windows with Python 3.12, `worker.main` explicitly selects
`WindowsSelectorEventLoopPolicy` and an explicit selector `asyncio.Runner` before
starting either worker entrypoint. This is required for psycopg's async
PostgreSQL connections; connection errors remain surfaced to the durable
retry/DLQ path rather than being suppressed.
