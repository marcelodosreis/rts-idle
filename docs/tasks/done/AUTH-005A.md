# AUTH-005A — Bootstrap consolidation

**Status:** done

## Task

- Objective: consolidate the authoritative bootstrap into one validated, testable server path.
- Scope: server bootstrap, protocol guards, integration tests, AUTH board.
- Non-goals: rooms, reconnects, or legacy wire compatibility.

## Read first

`docs/specs/SPEC-authoritative-match-bootstrap.md`, `apps/server/src/main.ts`, `apps/server/src/match-bootstrap.ts`, and protocol/integration tests.

## Contract

Each socket transitions `awaiting_request → running → closed`. Only one valid `match_request` creates a session, emits configuration/snapshot, and starts ticks; all invalid or duplicate input emits an error without mutation.

## Tests and validation

Focused protocol/integration bootstrap tests; `pnpm run test:contracts`; `pnpm run test:integration`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## Acceptance and stop conditions

- [ ] Socket lifecycle and map/scenario guards are covered.
- [ ] No session or timer precedes a valid request.
- [ ] Validation evidence is recorded before advancing.

## Completion report

Report PASS/BLOCKED, behavior, commands, changed files, and architecture impact.
