# QUAL-010 — Barrier singleton

**Status:** pending
**Phase:** Quality Hardening / Núcleo
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
