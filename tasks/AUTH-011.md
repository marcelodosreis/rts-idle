# AUTH-011 — Movement destination authority

**Status:** done

## Task

- Objective: route all movement mutation through destination helpers.
- Scope: commands and systems using `Movement`.
- Non-goals: movement mechanics changes.

## Read first

`packages/simulation/src/movement/destination.ts`, handlers, economy/combat/orders systems, movement tests.

## Contract

`setMovementDestination` resets remainders and `clearMovement` is the only removal path; no other simulation module mutates `Movement`.

## Tests and validation

`pnpm run test:simulation`; `pnpm run test:orders`; `pnpm run test:determinism`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## Acceptance and stop conditions

- [ ] Every movement write is helper-owned and deterministic remainders remain correct.

## Completion report

Report PASS/BLOCKED, helper audit, tests, and changed files.
