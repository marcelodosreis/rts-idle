---
status: open
classe: layout
barreira: QH.25
regressao:
  - tests/e2e/responsive/hud-responsive.spec.ts
---

# Wood HUD compact layout

## Summary

Adding the Wood statistic made the 800px-wide HUD overlap the centered match
clock with the resource panel, making both controls visually unreliable.

## Symptom

The responsive browser test reported overlapping `hud-topbar-stats`,
`hud-topbar-time`, and then `hud-topbar-brand` at 800x800 in Chromium and
Firefox.

## Root cause

The TopBar switched to its two-row compact layout only below 640px. Five stat
cards no longer fit beside the centered clock at 800px, and the HUD container
did not reserve height for a two-row layout at that width.

## What we missed

The Wood HUD addition did not include the existing 800px responsive acceptance
case in its focused browser validation.

## Fix

`TopBar.tsx` now uses its compact two-row layout through 899px and places the
clock in the second row. `MatchHud.tsx` reserves the corresponding 96px height
through the same breakpoint.

## Regression

`tests/e2e/responsive/hud-responsive.spec.ts` verifies that all top-bar regions
remain visible, contained, and non-overlapping at 800x800 in both browsers.

## Prevention

HUD indicator additions require the responsive browser suite in addition to
their feature flow tests.

## Verification

Reproduced with `CI=1 E2E_WORKERS=1 pnpm run test:e2e --
tests/e2e/responsive/hud-responsive.spec.ts --project=chromium
--project=firefox --grep-invert @perf`, then passed after the fix.
