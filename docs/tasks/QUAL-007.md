# QUAL-007 — Barrier input

**Status:** pending
**Phase:** Quality Hardening / Baratos
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
