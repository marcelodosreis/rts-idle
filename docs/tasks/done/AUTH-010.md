# AUTH-010 — Command admission

**Status:** done

## Task

- Objective: reject non-running, unknown, and defeated-player commands before handlers mutate.
- Scope: command dispatcher and simulation tests.
- Non-goals: changing individual command payload validation.

## Read first

`packages/simulation/src/commands/apply-command.ts`, handlers, command atomicity tests.

## Contract

Every command crosses one admission boundary before handler work; rejected state is observationally unchanged.

## Tests and validation

`pnpm run test:simulation`; `pnpm run test:orders`; `pnpm run test:determinism`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## Acceptance and stop conditions

- [x] All handlers share admission and rejected commands do not mutate.

## Completion report

PASS recorded after simulation validation.
