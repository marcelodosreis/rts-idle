---
status: open
classe: completion-gate
barreira: QH.27.01
regressao:
  - tests/e2e/web-routes.spec.ts
---

# E2E wall-clock waits and mid-animation measurement

## Summary

Several browser tests intermittently failed on CI even though the product code
was correct. The failures shared one cause: tests waited on wall-clock time and
measured elements while CSS animations were still running, so results depended
on runner speed instead of observable state. `failOnFlakyTests` turned each of
these into a hard red build, forcing re-runs and re-pushes.

## Symptom

- A queue card height differed by about 1 px while it played `hud-queue-insert`.
- Combat baselines were captured mid-effect after fixed 600 ms sleeps.
- "Nothing changed" assertions slept 700–2000 ms and then compared exact values.
- Popover and host boxes were measured during Radix/sonner entrance animations.
- Readiness gates used `getTick() > 0` instead of the full renderer-ready state.

## Root cause

The E2E suite treated time as a synchronisation primitive. `page.waitForTimeout`
and single-frame `requestAnimationFrame` waits encode a runner-speed assumption,
and `boundingBox()` reflects a transform, so measuring during an animation
returns transient geometry. Under CI CPU pressure these assumptions break and
the assertions observe the wrong instant.

## What we missed

Test authoring had no rule against wall-clock waits or measuring animated
elements, and the browser gate only observed final values. The queue-card and
navigation regressions each fixed one instance without addressing the class.

## Fix

- `playwright.config.ts` sets `use.reducedMotion: 'reduce'`, collapsing every
  `motion-safe` animation (and, via the global reduced-motion rule, Radix and
  sonner transitions) so layout measurements are settled.
- Every `waitForTimeout` was replaced with an observable wait:
  `waitForTicks` for simulation progress, `waitForStableRead` for values that
  settle, and direct `expect.poll` on the asserted state.
- `settleUnits` compares interpolated positions with an epsilon instead of exact
  equality, and readiness uses `waitForMatchReady` everywhere.
- Combat baselines wait for stable health; the camera waits for a stable
  world→screen mapping; transient pings poll at a fast interval.
- CI runs with `retries: 0`, so no retry can mask a residual flake.

## Regression

`pnpm run test:e2e:flaky` runs the curated historically flaky subset on Chromium
and Firefox. It passed twice consecutively after the change. The load-induced
navigation regression (`tests/e2e/web-routes.spec.ts`) remains the deterministic
check for the router-transition case.

## Prevention

`docs/engineering-standard.md` now forbids wall-clock waits, mid-animation
measurement, exact rendered-position equality, and `getTick() > 0` readiness in
E2E. CI keeps `failOnFlakyTests` and `retries: 0`, so any residual flake fails
immediately and is fixed at its root with a regression.

## Verification

- `pnpm run test:e2e:flaky` — 121 passed, twice consecutively (Chromium + Firefox).
- Focused Chromium run of every changed spec — 57 passed.
- `pnpm run verify`.
