---
status: open
classe: presentation
barreira: null
regressao:
  - tests/e2e/economy/production-playable.spec.ts
---

# Compact Resource Delta Alignment

## Summary

At medium viewport widths, the observed mineral delta appeared after the icon and value in the compact TopBar stat rather than centered within that stat. This made the transient feedback look detached from the resource it described.

## Symptom

At 900px wide, a refund delta such as `+50` was horizontally offset from the Minerals stat center.

## Root cause

The delta was a normal inline flex child. The compact breakpoint changes the stat to a horizontal layout, so the delta was placed after the resource value instead of being positioned independently.

## What we missed

The HUD feedback pass tested delta content but did not assert compact-breakpoint alignment after a real observed resource change.

## Fix

`apps/web/src/features/match/ui/TopBar.tsx` keeps the compact stat in the same vertical composition as desktop and offsets the smaller delta by one pixel upward, aligning it with the resource amount without overlap.

## Regression

`tests/e2e/economy/production-playable.spec.ts` creates a real refund delta, switches to 900px wide, and asserts that the delta remains inside the Minerals stat without overlapping the resource amount.

## Prevention

The production E2E now covers both observed-delta content and compact responsive placement, preventing future feedback additions from relying on inline layout at the compact breakpoint.

## Verification

- Focused Chromium production cancellation E2E passed after the fix.
- `pnpm run verify` will validate typecheck, lint, all non-browser suites, architecture, and build.
