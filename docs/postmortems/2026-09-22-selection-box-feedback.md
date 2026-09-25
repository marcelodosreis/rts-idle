---
status: open
classe: presentation
barreira: null
regressao:
  - tests/unit/renderer/selection-box.test.ts
  - tests/e2e/match/selection-feedback.spec.ts
---

# Selection Box Feedback Regression

## Summary

Box selection continued to update the logical selection after the unified input migration, but the visible drag rectangle was never rendered. The regression affected browser feedback while leaving the final selected unit IDs apparently functional.

## Symptom

Dragging over units selected them on release, but no selection rectangle appeared during the drag.

## Root cause

`WorldInputAdapter` emitted only a final selection-box event. The renderer still contained `SelectionController.startBox()` and `updateBox()`, but the unified interaction path never called them. A legacy callback fallback also obscured the missing visual lifecycle.

## What we missed

The acceptance criteria and E2E coverage checked selected IDs after release, not the visual state while the pointer was held. No test asserted that the visual controller received start and update events.

## Fix

`WorldInputAdapter` now emits selection start, update, and end interactions with screen and world coordinates. `PixiRenderer` owns the visual lifecycle through `SelectionController`, while `useMatchSession` owns logical selection. Legacy renderer callbacks were removed from `packages/renderer/src/types.ts` and `packages/renderer/src/renderer.ts`.

## Regression

`tests/unit/renderer/selection-box.test.ts` verifies visibility, normalized dimensions, finish, and cancellation. `tests/e2e/match/selection-feedback.spec.ts` verifies the actual browser rectangle remains visible during drag and disappears after release.

## Prevention

The unified input architecture now requires one `onInteraction` callback. `tests/architecture/world-input-contract.test.ts` prevents legacy callback APIs from returning, and the task acceptance criteria require visual drag lifecycle coverage.

## Verification

- `corepack pnpm run typecheck`
- `corepack pnpm exec vitest run tests/unit/select-units-in-box.test.ts tests/unit/renderer/selection-box.test.ts tests/architecture/world-input-contract.test.ts`
