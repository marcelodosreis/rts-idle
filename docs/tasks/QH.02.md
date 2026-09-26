# QH.02 — HUD contract (historical alias: QUAL-002)

**Status:** pending
**Phase:** Quality Hardening / Core
**Dependencies:** QUAL-001

## Objective

Define and test HUD presentation contract.

## Scope

- `tests/e2e/hud-presentation.spec.ts` — contract test

## Acceptance Criteria

- [ ] Bar and topbar geometry validated structurally
- [ ] Tests fail with wrong geometry (RED)

## Validation

- `pnpm run test:e2e`
