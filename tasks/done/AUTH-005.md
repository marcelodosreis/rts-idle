# AUTH-005 — Match bootstrap lifecycle

**Status:** done

## Task

- Objective: enforce one validated match request before a server session starts.
- Scope: protocol, server, integration contracts.
- Non-goals: multiplayer rooms and reconnects.

## Read first

`packages/protocol/src/messages/match.ts`, `apps/server/src/main.ts`, `apps/server/src/match-bootstrap.ts`, `apps/server/src/demo.ts`, relevant protocol and integration tests.

## Contract

Malformed JSON, invalid requests/maps/scenarios, commands before configuration, and duplicate requests return `error`; none allocate a session, snapshot, or timer. A normalized request yields config then initial snapshot then ticks.

## Tests and validation

`pnpm run test:contracts`; `pnpm run test:integration`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## Acceptance and stop conditions

- [ ] Lifecycle, duplicate, malformed, scenario, and map categories are tested.
- [ ] Valid catalog and local maps bootstrap successfully.

## Completion report

Report PASS/BLOCKED, behavior, tests, changed files, and architecture impact.
