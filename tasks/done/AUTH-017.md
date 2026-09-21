# AUTH-017 — Legacy authority removal

**Status:** done

## Task

- Objective: remove raw MOVE, Base/Construction aliases, and compatibility fallbacks.
- Scope: protocol, simulation fixtures/components, public API.
- Non-goals: supporting pre-0.6 clients.

## Read first

`packages/protocol/src/index.ts`, `packages/simulation/src/ecs/components.ts`, building component, fixtures, public API tests.

## Contract

Version 0.6.0 exposes only canonical command and Building contracts; no fallback serializes or projects legacy state.

## Tests and validation

`pnpm run test:contracts`; `pnpm run test:simulation`; `pnpm run test:architecture`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## Acceptance and stop conditions

- [ ] Legacy aliases, fixtures, and fallback paths are absent.

## Completion report

Report PASS/BLOCKED, migration evidence, tests, and changed files.
