# QH.07 — Barrier input (historical alias: QUAL-007)

**Status:** pending
**Phase:** Quality Hardening / Low Effort
**Dependencies:** QUAL-004

## Objective

Enforce input conventions via automated barrier.

## Scope

- `tests/unit/e2e-conventions.test.ts` — barrier test

## Acceptance Criteria

- [ ] Tests fail if mouse.click right-click is used raw
- [ ] Tests enforce contextmenu routing through input helper

## Validation

- `pnpm run test:unit`
