# QH.09 — Concurrent isolation (historical alias: QUAL-009)

**Status:** pending
**Phase:** Quality Hardening / Core
**Dependencies:** QUAL-000

## Objective

Test session isolation under concurrent access.

## Scope

- `tests/integration/session-isolation.test.ts` — isolation test

## Acceptance Criteria

- [ ] Sessions are isolated
- [ ] Tests fail if sessions share state

## Validation

- `pnpm run test:integration`
