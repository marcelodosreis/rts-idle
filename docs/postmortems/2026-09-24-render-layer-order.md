---
status: open
classe: presentation
barreira: null
regressao:
  - tests/unit/renderer/render-layers.test.ts
---

# Render Layer Order

## Summary

Newly created constructions could render above units, while initial buildings
and mineral nodes appeared below them. The inconsistent depth was caused by
runtime insertion order in the Pixi viewport.

## Symptom

When a unit crossed a construction created during the match, the construction
visually covered the unit. Initial world objects did not show the same problem.

## Root cause

World objects and units were added directly to the same viewport. Initial world
objects were inserted before unit sprites, but a newly created construction was
inserted after the existing unit containers. Pixi rendered siblings in insertion
order because no explicit scene-layer contract existed.

## What we missed

The renderer had lifecycle tests for world-object geometry and unit presentation,
but no test asserted the stable relative order of world objects and units after
later object creation.

## Fix

`RenderLayers` now owns persistent, ordered containers in
`packages/renderer/src/render-layers.ts`. Terrain, world objects, units,
selection, effects, interaction, and debug visuals are mounted into explicit
containers by `packages/renderer/src/renderer.ts`. New buildings and minerals
remain inside the world-object container, while construction previews use the
interaction container.

## Regression

`tests/unit/renderer/render-layers.test.ts` verifies the declared container order and
that world objects added after units remain below the unit layer.

## Prevention

Renderer modules no longer add gameplay visuals directly to the viewport. Future
depth changes are centralized in `RENDER_LAYER_ORDER`, and the layer-order test
guards against insertion-order regressions.

## Verification

- `pnpm exec vitest run tests/unit/renderer/render-layers.test.ts tests/unit/renderer/world-object-layer.test.ts tests/unit/renderer/selection-box.test.ts`
- `pnpm run typecheck`
- `pnpm run verify`
