---
status: open
classe: presentation
barreira: null
regressao:
  - tests/e2e/laboratory/diagnostics/stress.spec.ts
---

# Stress Canvas Growth

## Summary

The Laboratory stress route rendered an unstable canvas that kept increasing
in size instead of maintaining the intended stress viewport.

## Symptom

Opening `/laboratory/stress` caused the canvas to grow continuously. The stress
test content became unusable because the viewport expanded with the canvas.

## Root cause

The stress renderer host was an empty `div` with no explicit height. The shared
`createSectionApp` measures the host and resizes the Pixi renderer through a
`ResizeObserver`. Once the canvas was appended, it became the host's content
height, so each resize changed the measured host size and fed that size back
into the renderer.

## What we missed

The stress route had coverage for camera controls but no acceptance check for
the renderer host dimensions after mount. The fallback height passed to
`createSectionApp` was treated as a startup fallback rather than a layout
constraint, and the host did not encode the intended viewport height in CSS.

## Fix

The stress host now has an explicit `340px` height and hides canvas overflow in
`apps/web/src/features/laboratory/stress/StressView.tsx`.

## Regression

`tests/e2e/laboratory/diagnostics/stress.spec.ts` now verifies that the stress canvas mounts inside
the host and that the host remains exactly `340px` high after the renderer has
been running.

## Prevention

Stress and other section renderers must define an explicit host layout height
when the renderer's resize observer measures the host. The E2E regression now
guards against future feedback loops that grow a canvas-backed host.

## Verification

- `npx playwright test tests/e2e/laboratory/diagnostics/stress.spec.ts --project=chromium` — 3 passed.
- `npm run verify` — typecheck, lint, 701 non-browser tests, architecture barriers, invariants, and build passed.
- `npm run test:e2e:all` — not completed within the five-minute execution window; one unrelated construction E2E was flaky before timeout.
- `npx playwright test tests/e2e/laboratory/diagnostics/stress.spec.ts --project=chromium --project=firefox --workers=1` — Chromium passed; Firefox stress tests passed, while three earlier Firefox tests hit a dev-server connection refusal.
- `git diff --check` — passed.
