# QH.03 — Display list invariants (historical alias: QUAL-003)

**Status:** pending
**Phase:** Quality Hardening / Core
**Dependencies:** QUAL-001

## Objective

Enforce display list invariants via automated barrier.

## Scope

- `useMatchSession.ts` (RtsDebug) — debug hook
- `tests/e2e/canvas-invariants.spec.ts` — barrier test

## Acceptance Criteria

- [ ] Scale fallback == 1 invariant enforced
- [ ] inTree == true invariant enforced
- [ ] Tests fail if invariants violated

## Validation

- `pnpm run test:e2e`
