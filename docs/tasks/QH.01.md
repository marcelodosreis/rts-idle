# QH.01 — Structural harness (historical alias: QUAL-001)

**Status:** pending
**Phase:** Quality Hardening / Core
**Dependencies:** QUAL-000

## Objective

Create visual harness with structural assertions (no pixels).

## Scope

- `apps/web/visual.html` — harness page
- `apps/web/src/visual/main.ts` — harness logic
- `vite.config.ts` — configuration

## Acceptance Criteria

- [ ] Harness renders visual elements structurally
- [ ] Snapshot textual comparison works
- [ ] No pixel-based assertions

## Validation

- `pnpm run test:unit`
