---
status: open
classe: presentation
barreira: QH.02
regressao:
  - tests/e2e/match/hud-topbar.spec.ts
  - tests/e2e/responsive/hud-responsive.spec.ts
---

# Top Bar Reference Resolution Postmortem

## Summary

At the reference viewport of 958x910, the match timer overlapped the top-bar
resource statistics. The issue was limited to the browser HUD presentation and
did not affect authoritative match state.

## Symptom

The timer rendered over the Minerals, Supply, Units, and Selected statistics,
making the top bar visually crowded and difficult to read at 958x910.

## Root cause

The top bar used a single-row desktop layout below the mobile breakpoint. Its
right-side statistics and controls were wider than the space available beside
the centered timer, while the timer was positioned independently at the
viewport center. The layout had no reserved central exclusion area.

## What we missed

The initial responsive acceptance matrix covered 800, 1280, and 1440 widths,
but did not treat 958x910 as the product reference viewport. The test also
measured nested resource groups as independent regions instead of the actual
top-bar regions.

## Fix

`TopBar.tsx` now uses compact resource chips and small icon-only controls so the
reference viewport remains a single row with a reserved central timer. Resource
statistics are split into visually distinct Economy and Force groups. The
two-row layout is limited to genuinely narrow mobile screens, and `MatchHud.tsx`
reserves the additional top-bar height only for that mobile layout.

## Regression

`tests/e2e/match/hud-topbar.spec.ts` asserts the timer is centered and all four
top-bar regions do not overlap at 958x910. The responsive HUD suite includes
958x910 in its viewport matrix.

## Prevention

The reference viewport is now an explicit browser acceptance case. Future
top-bar changes must preserve the four-region geometry, single-row reference
layout, and narrow-mobile breakpoint before the responsive gate can pass.

## Verification

- `corepack pnpm run test:e2e:focused tests/e2e/match/hud-topbar.spec.ts --project=chromium --project=firefox --workers=1`
- `corepack pnpm run test:e2e:focused tests/e2e/responsive/hud-responsive.spec.ts --project=chromium --project=firefox --workers=1`
