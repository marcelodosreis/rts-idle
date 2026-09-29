---
status: open
classe: presentation
barreira: QH.20
regressao:
  - tests/e2e/web-routes.spec.ts
---

# Stale Match Renderer Released Shared Pixi Resources

## Summary

Navigating from the match screen to the Laboratory could leave the Laboratory
route without its Asset Browser title in CI. A match renderer mount that was
still initializing could release Pixi global resources during navigation, while
the lazy Laboratory route was also being compiled for the first time under the
accumulated CI workload.

## Symptom

The browser URL changed to `/laboratory`, but the Match → Laboratory E2E waited
for `laboratory-page-title` until its 60-second timeout. Direct Laboratory
routes remained healthy, and the failure was sensitive to CI timing.

## Root cause

`PixiRenderer.mount()` initializes its `Application` asynchronously. When the
match route unmounted before initialization finished, the stale application was
destroyed with `releaseGlobalResources: true`. That cleanup could race the
Laboratory's new Pixi application and invalidate shared renderer resources.
The route transition also requested the lazy Laboratory page only after the
click, leaving its module compilation on the critical navigation path during the
long CI suite.

## What we missed

The renderer lifecycle test covered stale renderer disposal but only used a
fake renderer, so it did not exercise Pixi's shared global resource lifetime.
The browser route test asserted navigation after the match session, but the
CI-only async initialization race was not reproduced locally.

## Fix

Stale applications created by an obsolete asynchronous mount are now destroyed
without releasing global Pixi resources. Normal renderer disposal retains the
existing global cleanup behavior. The Open Laboratory link also preloads its
lazy page on focus, pointer entry, or click so navigation does not begin with a
cold route module.

## Regression

`tests/e2e/web-routes.spec.ts` exercises the real Match → Laboratory link and
asserts that the Laboratory page mounts after the route transition.

## Prevention

Async renderer cleanup now distinguishes stale application disposal from normal
route teardown, and the route transition preloads its lazy module before
navigation. The browser regression stays in the functional E2E gate for both
browsers.

## Verification

The focused route test passed 13/13, the route transition passed 50/50 repeated
runs, the Chromium functional suite passed 96/96, and repository verification
passed. The CI Functional E2E gate remains required after push.
