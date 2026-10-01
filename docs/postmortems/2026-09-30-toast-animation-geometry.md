---
status: open
classe: coverage
barreira: null
regressao:
  - tests/e2e/economy/building-hud.spec.ts
---

# Toast Geometry Measured Mid-Animation

## Summary

The construction-completion E2E occasionally failed its toast placement check
with the toast reported at the top of the viewport, overlapping the top bar,
even though the settled layout was correct.

## Symptom

`expect(toastPosition.toastTop).toBeGreaterThanOrEqual(toastPosition.topbarBottom)`
failed with `toastTop` near 3 px while the top bar bottom was near 43 px. The
failure was intermittent and grew more likely as preceding assertions resolved
faster.

## Root cause

The test measured `getBoundingClientRect()` immediately after asserting the
toast text and classes. Sonner's top-positioned toasts enter the screen with a
`translateY(-100%)` transform that transitions to zero, so early measurements
capture the toast above its final position. The final layout was correct; the
assertion read a transient animation frame.

## What we missed

The placement assertion read geometry once instead of waiting for the entrance
animation to settle. Other layout checks in the suite already poll for stable
geometry, but this one did not.

## Fix

`tests/e2e/economy/building-hud.spec.ts` now polls the placement invariant until
it holds: the toast top must be at or below the top bar bottom, and the right
margin must be 12 px within 1 px. The same final-layout requirement is asserted,
without reading a transient frame.

## Regression

The updated test covers the construction-completion toast position in both
Chromium and Firefox and no longer depends on animation timing.

## Prevention

Geometry assertions on animated elements must poll for the settled layout
invariant; single-frame `getBoundingClientRect()` reads are not accepted for
entering or exiting UI.

## Verification

- `pnpm run test:e2e:focused tests/e2e/economy/building-hud.spec.ts` — 12 passed
  across Chromium and Firefox.
