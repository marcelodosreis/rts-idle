# QH.10 — Barrier singleton (historical alias: QUAL-010)

**Status:** pending
**Phase:** Quality Hardening / Core
**Dependencies:** QUAL-000

## Objective

Enforce no mutable singletons via automated barrier.

## Scope

- `tests/architecture/no-mutable-singletons.test.ts` — barrier test

## Acceptance Criteria

- [ ] Tests fail if mutable singletons exist
- [ ] Barrier enforced in CI

## Validation

- `pnpm run test:architecture`
