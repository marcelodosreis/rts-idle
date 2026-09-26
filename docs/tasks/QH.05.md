# QH.05 — Gesture matrix (historical alias: QUAL-005)

**Status:** pending
**Phase:** Quality Hardening / Core
**Dependencies:** QUAL-004

## Objective

Create input matrix test covering all gesture types.

## Scope

- `tests/e2e/input-matrix.spec.ts` — matrix test

## Acceptance Criteria

- [ ] All gesture types tested (click, right-click, contextmenu, touch)
- [ ] Tests fail if contextmenu doesn't route to commands

## Validation

- `pnpm run test:e2e`
