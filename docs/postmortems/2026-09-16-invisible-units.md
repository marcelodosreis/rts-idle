---
status: closed
classe: presentation
barreira: null
regressao:
  - tests/e2e/regression-units-visible.spec.ts
---

# Postmortem: Units invisible in the browser renderer

Date: 2026-09-16

## Summary

After mounting the demo match, no units were visible on screen even though the
browser was connected to the authoritative server and snapshots were flowing.
Data flow worked end-to-end; presentation failed.

## Symptom

Opening `http://localhost:5173` with the demo server running showed an empty
paper-colored canvas. The status line gave no indication of a problem, and no
units were drawn.

## Root cause

`packages/renderer/src/renderer.ts` called `viewport.fitWorld()` on mount. The
world is `192 tiles × 256 = 49,152` units per side. `fitWorld()` scaled the
entire world to fit the ~1280×800 viewport, producing a scale of ~`0.016`.
Units have a radius of 8 world units, so they rendered at roughly `0.13` screen
pixels — invisible. Had the transform not applied, the units at `(2048, 2048)`
would instead have been outside the visible rectangle. Either way: blank screen.

## What we missed

The Phase 0 E2E tests validated **data flow**, not **presentation**. The
`select-and-move` test read `getPositions()` — the renderer's internal unit map,
populated regardless of camera or scale — and asserted the unit moved. Nothing
asserted that a unit actually appears on screen at a visible size. The
acceptance criteria for P0.15/P0.16 lacked a "unit is visible in the viewport"
check, so the tests passed against an empty screen.

## Fix

- `packages/renderer/src/renderer.ts`: removed `viewport.fitWorld()`; the camera
  now starts at `initialZoom` (default 1, one world unit per pixel) centered on
  `initialCenter` (default world center), with `clampZoom({ minScale: 0.05,
  maxScale: 4 })` so users can zoom without losing the world.
- `apps/web/src/screens/MatchScreen.tsx`: starts centered on the player 0 base
  at zoom 1; connection status now reflects the real WebSocket `open`/`error`
  state and shows the unit count.

## Regression

`tests/e2e/regression-units-visible.spec.ts` — fails without the fix:

- asserts initial `getZoom()` ≥ `0.9` (catches any `fitWorld()` reintroduction
  or collapsed scale);
- asserts `worldToScreen` of a known unit lands **inside the canvas bounds**
  (catches a camera positioned off the units).

## Prevention

- A permanent regression test now guards this exact class of failure.
- **Bug Response Protocol** (see `AGENTS.md`): every bug requires a postmortem
  and a permanent regression test before it is closed.
- Acceptance criterion added for renderer work: any spike/feature involving
  presentation must validate on-screen visibility, not just data flow.

## Verification

- `pnpm run test:e2e` — all suites pass, including the new regression test.
- `pnpm run typecheck`, `pnpm run lint`, `pnpm run build` — green.
- Manual: demo server + web, units visible at the player base, click to select,
  right-click to move, zoom/pan working.