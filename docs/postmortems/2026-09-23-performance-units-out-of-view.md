---
status: open
classe: presentation
barreira: null
regressao:
  - tests/e2e/laboratory/renderer-perf.spec.ts
---

# Performance Units Out Of View

## Summary

The performance harness rendered a blue canvas without visible units because
the benchmark camera was centered far away from the generated unit grid.

## Symptom

Running the performance test showed only the renderer background. The unit
count and frame metrics updated, but the visual benchmark scene was not visible.

## Root cause

The benchmark placed units starting at the origin while the renderer camera was
initialized at `{ x: 6144, y: 6144 }`. The generated grid occupied only the
upper-left region, outside the camera view. A fixed `0.05` zoom also did not
adapt to the requested unit count or the responsive host size.

## What we missed

The performance E2E suite verified frame metrics but did not verify that the
generated scene was inside the initial camera view. The manual UI had no visual
containment or framing acceptance criterion.

## Fix

The benchmark now calculates the generated grid bounds, centers the camera on
that grid, and chooses a fitting zoom from the host dimensions in
`RendererPerformanceFeature.tsx`.

## Regression

`tests/e2e/laboratory/renderer-perf.spec.ts` verifies that the benchmark returns a positive
camera center and a bounded fit zoom, while the manual path verifies the canvas
is mounted inside the performance host.

## Prevention

Performance scenes must derive camera framing from the generated content rather
than using a fixed world center. The benchmark contract now exposes the derived
layout in its browser diagnostic result for regression coverage.

## Verification

- `npx playwright test tests/e2e/laboratory/renderer-perf.spec.ts --project=chromium`
- `npm run typecheck`
- `npm run lint`
- `git diff --check`
