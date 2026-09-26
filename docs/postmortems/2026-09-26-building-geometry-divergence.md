---
status: open
classe: presentation
barreira: QH.20
regressao:
  - tests/unit/renderer/world-object-layer.test.ts
  - tests/unit/simulation/placement.test.ts
  - tests/simulation/economy/building-construction.test.ts
---

# Building Geometry Divergence

## Summary

Building art, construction work points, and renderer hitboxes used different
geometries. Barracks displayed a cropped sprite while construction and click
handling still used the larger logical tile rectangle, producing an empty lower
area and inconsistent sprite-on/sprite-off behavior.

## Symptom

The worker stopped below the visible Barracks with an empty gap. Clicking that
empty area still selected the Barracks. Toggling sprites changed the apparent
building size.

## Root cause

The PNG canvas footprint, opaque cropped bounds, simulation tile footprint, and
fallback renderer geometry were treated as interchangeable. They were not. The
renderer also had an older compiled `dist` path using `footprint * pixelsPerTile`
for hitboxes, while the source had moved to cropped art bounds.

## What We Missed

Tests covered renderer geometry without exercising the sprite toggle and did not
assert the worker work point against the visible Barracks bounds. Browser
validation also did not rebuild the workspace packages before checking the
compiled renderer path.

## Fix

`packages/shared/src/domain/building-geometry.ts` is now the single geometry
table. It supplies logical placement footprints and opaque visual sizes. The
renderer uses the visual size for sprites, fallbacks, previews, borders, and
hitboxes. `construction-work-point.ts` uses the same visual size when assigning
workers to construction edges.

## Regression

Renderer tests assert that fallback and preview bounds match the cropped art and
that clicks outside the visible Base bounds do not select it. Simulation tests
assert that a Barracks work point uses the cropped height rather than its
four-tile logical height.

## Prevention

Future building geometry changes must update the shared table and its paired
renderer/simulation regressions. The build gate now rebuilds workspace packages
before browser validation so stale package output cannot mask source changes.

## Verification

- `pnpm exec vitest run tests/unit/simulation/placement.test.ts tests/simulation/economy/building-construction.test.ts`
- `pnpm exec vitest run tests/unit/renderer/world-object-layer.test.ts`
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test:architecture`
