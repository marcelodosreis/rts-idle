---
status: open
classe: layout
barreira: QH.26.01
regressao:
  - tests/e2e/economy/research-playable.spec.ts
---

# Queue card animation measurement

## Summary

The Firefox functional job failed on "uses the same queue card dimensions for
research and units". The research and unit cards should be identical, but their
measured heights differed by about 1.01 px. The test passed on retry, and the
fail-on-flaky policy marked the job as failed.

## Symptom

`Math.abs(researchCard.height - unitCard.height)` was `1.0123291015625` while
the assertion required `< 1`.

## Root cause

A newly inserted queue card plays the `hud-queue-insert` animation
(`transform: scale(0.96)` → `scale(1)`). `boundingBox()` returns the transformed
box, so measuring while the animation is still running yields a scaled height.
On a slow runner the measurement lands inside the 220 ms animation window; in
this case the active research card was still mid-scale, so its height was about
one pixel smaller than the settled unit card.

## What we missed

The assertion described stable layout dimensions but did not control motion, so
it depended on animation timing. It had passed on faster runs and only surfaced
on the loaded CI runner.

## Fix

The test now calls `page.emulateMedia({ reducedMotion: 'reduce' })` before
building the queue. The insert animation is declared `motion-safe`, and the
global reduced-motion rule collapses its duration to 1 ms, so the cards are
measured in their settled layout.

## Regression

`tests/e2e/economy/research-playable.spec.ts` ("uses the same queue card
dimensions for research and units") measures the cards with motion reduced and
still asserts identical dimensions. Without the motion reduction the assertion
is timing-dependent and fails under load.

## Prevention

The dimension regression no longer depends on animation timing, so the QH.26.01
functional lane fails only when the queue card layout actually diverges.

## Verification

- Focused Firefox run of the queue card dimension test.
- `pnpm run verify`.
- `pnpm run test:e2e:fast`.
