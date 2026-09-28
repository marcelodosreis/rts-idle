---
status: open
classe: presentation
barreira: null
regressao:
  - tests/unit/renderer/unit-economy.test.ts
---

# Repair Facing While Moving

## Summary

Repair/build target orientation was applied before movement orientation, causing a pawn to face the work target while walking toward it. This made workers visibly walk backwards when the target was behind their travel direction.

## Symptom

The pawn turned toward the construction or repair target immediately after receiving the order, even while its position was still changing toward the work point.

## Root cause

`UnitSprite.setState` prioritized `lookAtX` whenever it was present. The projection intentionally included `lookAtX` for the full BUILD/REPAIR order, including the travel phase, so target orientation overrode the movement delta.

## What we missed

The animation E2E asserted the target-facing state but did not assert that movement direction wins during the travel phase. The renderer unit tests covered animation selection but not facing precedence.

## Fix

`facingForState` now gives movement direction precedence while `moving` is true and applies `lookAtX` only after movement stops. `UnitSprite` delegates the decision to this pure helper.

## Regression

`tests/unit/renderer/unit-economy.test.ts` asserts that a moving pawn keeps its left-facing direction even when the work target is to the right, and that a stopped pawn faces the target.

## Prevention

Facing precedence is now covered independently from Pixi display objects, making the travel-versus-work transition deterministic and directly testable.

## Verification

- `pnpm exec vitest run tests/unit/renderer/unit-economy.test.ts`
- `pnpm run verify`
- Repair browser E2E in Chromium
