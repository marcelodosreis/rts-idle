# QH.09 — Concurrent isolation (historical alias: QUAL-009)

**Status:** done
**Phase:** Quality Hardening / Core
**Dependencies:** QUAL-000

## Objective

Test session isolation under concurrent access.

## Scope

- `tests/integration/session-isolation.test.ts` — isolation test

## Contract

- Two real `GameSession` instances start from the same regression scenario.
- Advancing and observing one session cannot mutate the other session's hash or observation.
- After both sessions receive the same command and advance independently, their canonical hashes converge.

## Acceptance Criteria

- [x] Sessions are isolated
- [x] Tests fail if sessions share state

## Validation

- `pnpm run test:integration`

## Completion Report

`tests/integration/session-isolation.test.ts` interleaves two real regression
sessions, proves the untouched session hash and observation remain unchanged,
and proves both sessions converge after receiving the same command. The full
integration suite passed with 31 tests.
