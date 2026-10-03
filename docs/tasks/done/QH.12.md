# QH.12 — expectAnim + barrier (historical alias: QUAL-012)

**Status:** done
**Phase:** Quality Hardening / Low Effort
**Dependencies:** QUAL-000

## Objective

Create expectAnim helper and barrier against literal animation assertions.

## Scope

- `tests/e2e/support/art.ts` — expectAnim helper
- `tests/unit/tools/e2e-conventions.test.ts` — barrier
- E2E animation assertions migrated to the helper

## Contract

- Animation assertions accept stable animation states rather than exact frame numbers.
- `expectAnim` validates visibility, display-list membership, and a non-negative integer frame for authored animations.
- Fallback assertions explicitly opt into the `fallback` state.
- The convention barrier rejects direct literal assertions on `getSpriteState(...).anim` and `getAnimationFrame(...)`.

## Acceptance Criteria

- [x] expectAnim helper validates animation frames structurally
- [x] Barrier fails if literal animation assertions exist

## Validation

- `pnpm run test:unit`

## Completion Report

`tests/e2e/support/art.ts` now exposes `expectAnim`, which validates display-list
membership, visibility, and frame structure while allowing stable animation
state sets. Existing literal browser animation assertions were migrated, and
`tests/unit/tools/e2e-conventions.test.ts` prevents them from returning. Unit,
focused browser, and complete Chromium/Firefox E2E validation passed.
