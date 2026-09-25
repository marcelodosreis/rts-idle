---
status: open
classe: presentation
barreira: null
regressao:
  - tests/unit/renderer/terrain-scene.test.ts
---

# PixiJS Terrain Render Race

## Summary

Terrain decoration loads could finish after a newer render and append stale
objects to the current scene.

## Symptom

Rapid terrain updates or palette changes could show duplicated or obsolete
decorations.

## Root cause

Decoration rendering was started with `void` asynchronous calls without a
generation check. Older promises could mutate the dressing container after a
new render had cleared it.

## What we missed

Terrain tests covered deterministic layout and parity, but not out-of-order
asset completion during consecutive renders.

## Fix

Terrain renders now use generation tokens, palette requests are versioned, and
obsolete asynchronous work stops before attaching display objects.

## Regression

`tests/unit/renderer/terrain-scene.test.ts` resolves an obsolete decoration load after a
new render and asserts that no stale child is attached.

## Prevention

All asynchronous scene mutations must validate the active render generation
before changing the Pixi display tree.

## Verification

Focused terrain tests, typecheck, lint, and renderer E2E coverage.
