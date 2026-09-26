# QH.22 — Public API and Docs Sync (historical alias: QUAL-022)

**Status:** done
**Phase:** Quality Hardening / Fundação
**Dependencies:** QUAL-019, QUAL-021

## Objective

Sync the documented public surface and the canonical simulation docs with the
typed-domain baseline.

## Scope

- `tests/architecture/public-api.test.ts` — type and value export lists
- `docs/determinism.md`, `docs/simulation.md` — version and component/pipeline tables
- `packages/renderer/src/index.ts` — export the building visual style module

## Acceptance Criteria

- [x] Public API lists include the new registries, `assertNever`, parse helpers,
      `AssetKey`, and the sprite/visual kinds
- [x] `SIMULATION_VERSION` documented as `0.9.0`; pipeline and component tables match reality
- [x] `pnpm run test:architecture` and `pnpm run lint` green

## Validation

- `pnpm run test:architecture`
- `pnpm run lint`
- `pnpm run verify`

## Completion Report

PASS. Updated the public-surface documentation list, exposed the building visual
style module from the renderer barrel, and corrected the simulation/determinism
docs (version `0.9.0`, supply system step, `Building` component).
