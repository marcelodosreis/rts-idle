---
status: open
classe: presentation
barreira: null
regressao:
  - tests/e2e/laboratory/renderer-perf.spec.ts
---

# Performance Canvas Outside Harness

## Summary

The manual renderer performance benchmark mounted its canvas below the
performance card with a fixed desktop size instead of rendering inside the
responsive harness container.

## Symptom

Running the performance benchmark created a broken-looking canvas outside the
Performance harness panel. Its `1280x720` dimensions did not match the card or
the current viewport.

## Root cause

`runRendererPerf` always created a new `div`, assigned fixed dimensions, and
appended it directly to `document.body`. The UI called the same global hook
used by automation, so the benchmark had no relationship to the feature's
layout container.

## What we missed

The performance page was initially designed as an automation harness and had
no user-visible canvas placement acceptance criterion. The browser test
verified metrics but not where the renderer canvas was mounted.

## Fix

The feature now owns a responsive renderer host inside the Performance harness.
The automation hook keeps its isolated offscreen host, while manual runs mount
into the feature host and retain the renderer until the next run or unmount.

## Regression

`tests/e2e/laboratory/renderer-perf.spec.ts` verifies that a benchmark canvas is mounted
inside `performance-canvas-host` and does not exceed its bounds.

## Prevention

Manual renderer tools must receive an explicit visual host and must not append
fixed-size diagnostic canvases to `document.body`. The browser regression now
checks containment and responsive sizing.

## Verification

- `npx playwright test tests/e2e/laboratory/renderer-perf.spec.ts --project=chromium`
- `npm run typecheck`
- `npm run lint`
- `git diff --check`
