---
status: open
classe: presentation
barreira: null
regressao:
  - tests/e2e/match/control-click-attack.spec.ts
  - tests/e2e/regression/regression-move-fractional-coords.spec.ts
---

# Canvas Secondary Input and Page Zoom

## Summary

The browser game had input behavior split between Pixi sprites, viewport events, and a DOM context-menu listener. On macOS, Control-click could select the wrong unit, secondary commands could be missed on some canvas locations, and trackpad pinch could reach browser page zoom. The issue affected contextual commands and camera interaction.

## Symptom

Players needed Control-click on macOS for some secondary actions. A right-click could be lost when the browser delivered pointer and context-menu events differently. Trackpad gestures could zoom the page instead of only the game canvas.

## Root cause

Input ownership was distributed across child sprite handlers and viewport/DOM handlers. Pixi propagation could stop a Control-click before the contextual path ran. The viewport wheel plugin was passive, so the renderer could not reliably prevent browser-level scrolling or zooming.

## What we missed

The tests covered individual right-click flows but did not assert one normalized secondary interaction across mouse and macOS-compatible Control-click paths. They also did not cover canvas page-zoom containment or pointer cancellation/focus loss.

## Fix

- Added typed renderer input contracts in `packages/renderer/src/input/`.
- Removed gameplay selection handlers from `packages/renderer/src/unit-layer.ts`.
- Added pointer-down secondary handling with deduplicated `contextmenu` fallback.
- Configured non-passive shared camera controls and canvas gesture styles.
- Added explicit Mouse/Trackpad preferences and controls UI.
- Added focus-loss and match-finished cancellation guards.
- Fixed canvas sizing so the interactive surface remains inside the visible host.

## Regression

- `tests/e2e/match/control-click-attack.spec.ts` verifies Control-click does not replace the selection.
- `tests/e2e/regression/regression-move-fractional-coords.spec.ts` verifies secondary input after fractional camera movement.
- `tests/e2e/input-controls.spec.ts` verifies persisted input profile and canvas gesture containment.

## Prevention

All new world input must enter through the renderer adapter and be covered by semantic interaction tests. Browser-level gesture behavior is documented in `docs/input-controls.md` and the architecture decision is recorded in `docs/adr/ADR-017-unified-world-interaction.md`.

## Verification

`pnpm run verify` passed. The Chromium E2E suite passed all 71 tests, including the listed regressions.
