---
status: open
classe: presentation
barreira: QH.17
regressao:
  - tests/e2e/laboratory/sprites-lab-responsive.spec.ts
---

# Terrain Editor Narrow Canvas

## Summary

At the requested `958x910` resolution, the terrain editor entered its desktop
two-column layout while the toolbar still consumed the full row width. The
canvas was reduced to an almost zero-width host and appeared black or unstable.

## Symptom

The editor was poorly responsive at `958x910`; the canvas appeared black and
grew incorrectly while the layout changed.

## Root cause

The editor switched to `flex-row` at the `lg` breakpoint, while the toolbar
width also switched to `200px` only at `lg`. Moving the layout to the smaller
`md` breakpoint without moving the toolbar width caused both flex children to
claim the full width, leaving the canvas with approximately `2px`.

## What we missed

Responsive coverage checked `910px` and `1278px`, but did not assert the exact
requested `958x910` layout or the canvas-to-host bounds at that resolution.

## Fix

The terrain editor row layout and fixed `200px` toolbar now both begin at the
`md` breakpoint in `TerrainView.tsx` and `terrain-toolbar.tsx`.

## Regression

`tests/e2e/laboratory/sprites-lab-responsive.spec.ts` now checks the editor at
`958x910`, including one canvas, positive host dimensions, a wide enough host,
and canvas bounds within the host.

## Prevention

The responsive editor test pins the requested resolution and validates the
layout geometry instead of checking only document overflow.

## Verification

- `corepack pnpm run test:e2e:focused tests/e2e/laboratory/sprites-lab-responsive.spec.ts --project=chromium --workers=1 --grep "requested HUD|level editor fits"` — 2 passed.
- `corepack pnpm --filter @rts/web typecheck` — passed.
- `corepack pnpm exec biome check --write apps/web/src/features/laboratory/editor/TerrainView.tsx apps/web/src/features/laboratory/editor/terrain-toolbar.tsx tests/e2e/laboratory/sprites-lab-responsive.spec.ts` — passed.
