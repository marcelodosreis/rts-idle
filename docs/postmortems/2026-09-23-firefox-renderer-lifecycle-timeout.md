---
status: open
classe: presentation
barreira: null
regressao:
  - tests/e2e/renderer-lifecycle.spec.ts
---

# Firefox Renderer Lifecycle Timeout

## Summary

The asset-delayed renderer lifecycle test timed out intermittently in Firefox
when the complete file ran with multiple workers.

## Symptom

The websocket was connected, but `window.__rtsDebug` was still unavailable
when the test's five-second poll expired.

## Root cause

The debug bridge is installed only after the renderer finishes manifest loading,
Pixi application initialization, and terrain construction. The test used the
default five-second assertion timeout despite intentionally delaying the asset
request and running under browser contention.

## What we missed

The test did not allocate a timeout proportional to its deliberate delayed
mount scenario and had no explicit renderer-ready wait contract.

## Fix

The delayed-mount test now has a 15-second readiness poll and a 30-second test
budget while retaining canvas, position, and page-error assertions.

## Regression

The existing delayed-mount scenario remains the regression and is executed in
both Chromium and Firefox.

## Prevention

Browser tests that intentionally delay lifecycle dependencies must use an
explicit bounded readiness timeout rather than the five-second default.

## Verification

Run the focused lifecycle test in both projects and the full browser gate.
