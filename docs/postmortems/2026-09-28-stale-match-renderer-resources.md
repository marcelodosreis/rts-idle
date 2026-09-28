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
still initializing completed after navigation and released Pixi global
resources while the new Laboratory renderer was starting.

## Symptom

The browser URL changed to `/laboratory`, but the Match → Laboratory E2E waited
for `laboratory-page-title` until its 60-second timeout. Direct Laboratory
routes remained healthy, and the failure was sensitive to CI timing.

## Root cause

`PixiRenderer.mount()` initializes its `Application` asynchronously. When the
match route unmounted before initialization finished, the stale application was
destroyed with `releaseGlobalResources: true`. That cleanup could race the
Laboratory's new Pixi application and invalidate shared renderer resources.

## What we missed

The renderer lifecycle test covered stale renderer disposal but only used a
fake renderer, so it did not exercise Pixi's shared global resource lifetime.
The browser route test asserted navigation after the match session, but the
CI-only async initialization race was not reproduced locally.

## Fix

Stale applications created by an obsolete asynchronous mount are now destroyed
without releasing global Pixi resources. Normal renderer disposal retains the
existing global cleanup behavior.

## Regression

`tests/e2e/web-routes.spec.ts` exercises the real Match → Laboratory link and
asserts that the Laboratory page mounts after the route transition.

## Prevention

Async renderer cleanup now distinguishes stale application disposal from normal
route teardown. The route transition remains in the functional E2E gate for both
browsers.

## Verification

The focused route test, Chromium functional suite, repository verification, and
the CI Functional E2E gate are run after the fix.
