# QUAL-012 — expectAnim + barrier

**Status:** pending
**Phase:** Quality Hardening / Baratos
**Dependencies:** QUAL-000

## Objective

Create expectAnim helper and barrier against literal animation assertions.

## Scope

- `tests/e2e/art.ts` — expectAnim helper
- `tests/unit/e2e-conventions.test.ts` — barrier

## Acceptance Criteria

- [ ] expectAnim helper validates animation frames structurally
- [ ] Barrier fails if literal animation assertions exist

## Validation

- `pnpm run test:unit`
