## Exploration: ibera-alerta-inmet-payload-compatibility

### Current State
During local-real verification runs, the INMET RSS scraper receives an HTTP 200 response containing a 37-character (40-byte UTF-8) plain text payload: `"Não há avisos meteorológicos ativos.\n"`.
Because this payload does not start with `<rss`, the current parser (`InmetAdapter.parse`) bypasses the XML/RSS parsing logic and attempts to parse it as JSON using `JSON.parse(payload)`. This throws a `SyntaxError: Unexpected token N in JSON at position 0`, which is caught by the scraper's safety wrapper as a `parse_failure`.
As a result, a valid empty/no-alert condition is erroneously classified as a scraper failure, blocking the full local verification.

### Affected Areas
- `packages/hydrology-engine/src/adapters/inmet-adapter.ts` — Location of the `InmetAdapter` parsing logic which currently lacks plain-text empty response classification.
- `packages/hydrology-engine/src/clients/http-clients.test.ts` — Needs regression test coverage for the 37-byte empty payload condition.

### Approaches
1. **Approach A: Explicit Plain-Text Match (Strict/Recommended)**
   Add a specific check in `InmetAdapter.parse` for the plain-text empty advisory message (`"Não há avisos meteorológicos ativos."` or general pattern `/não há avisos/i`) to cleanly return an empty array `[]` of records.
   - Pros: Simple, precise, and completely safe. It prevents valid empty conditions from crashing the parser while ensuring that true upstream errors (e.g. HTML error/maintenance pages) are still correctly identified and reported as failures.
   - Cons: Requires matching a specific text pattern.
   - Effort: Low

2. **Approach B: Permissive Catch-All / Silent Empty Failure**
   Wrap the `JSON.parse` call in `InmetAdapter.parse` in a try-catch block and return `[]` for any parse failure instead of throwing.
   - Pros: Extremely permissive; never crashes on unexpected payload structures.
   - Cons: Dangerously hides actual upstream failures. HTML maintenance portals, error pages, or CAPTCHA blocks returned with HTTP 200 would be silently treated as successful runs with zero records.
   - Effort: Low

### Recommendation
**Approach A** is highly recommended. It perfectly balances strict validation and real-world robustness. It prevents false-positive alerts on valid empty runs without sacrificing the critical safety checks that distinguish true failures from successful empty conditions.
The change is extremely narrow, isolated to a single adapter and a test file, making it ideal for a targeted **`sdd-apply`** rather than a full `sdd-ff` re-planning phase.

### Risks
- **Upstream message change**: If INMET changes the exact plain-text message when there are no alerts, the adapter may fall back to throwing a JSON parse error again.
  - *Mitigation*: Use a case-insensitive regex pattern matching `não há avisos` or `no active warnings` to stay highly resilient to punctuation or minor casing changes.

### Ready for Proposal
**Yes**. The root cause of the 37-byte payload failure has been fully diagnosed, and a safe, local-only testable resolution has been mapped. The orchestrator should proceed with a proposal for the narrow corrective change.
