# QUAL-008 — Dynamic geometry

**Status:** pending
**Phase:** Quality Hardening / Low Effort
**Dependencies:** QUAL-002

## Objective

Test HUD with dynamic content using relative layout.

## Scope

- `tests/e2e/hud-responsive.spec.ts` — responsive test

## Acceptance Criteria

- [ ] Tests pass with dynamic content
- [ ] No absolute positioning in HUD assertions

## Validation

- `pnpm run test:e2e`
