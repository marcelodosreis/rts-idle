---
status: open
classe: coverage
barreira: null
regressao:
  - tests/unit/renderer/world-object-layer.test.ts
---

# Fog Memory Interaction

## Summary

Remembered buildings were rendered with stale observation data and remained
available to world hit testing, allowing the client to interact with a building
that was no longer currently visible.

## Symptom

A building carrying `lastSeenTick` was included in the renderer's construction
hitbox map and could be returned by `buildingAt` while outside current vision.

## Root cause

The renderer treated every building in a filtered observation as a live
interactive object. It did not distinguish a current building projection from
the retained memory projection used for explored terrain.

## What we missed

The first fog renderer tests checked tile alpha and visibility only. They did
not exercise hit testing against a remembered building, so stale memory could
remain an input target.

## Fix

`WorldObjectLayer` now creates construction hitboxes only for buildings without
`lastSeenTick`. Remembered buildings remain presentational and cannot be used as
current interaction targets.

## Regression

`tests/unit/renderer/world-object-layer.test.ts` verifies that a remembered
building is rendered but `buildingAt` returns `null` for its footprint.

## Prevention

Memory projections must remain read-only presentation data. Renderer tests now
cover both their visual presence and their interaction boundary.

## Verification

- `pnpm exec vitest run tests/unit/renderer/world-object-layer.test.ts`
- `pnpm run verify`
