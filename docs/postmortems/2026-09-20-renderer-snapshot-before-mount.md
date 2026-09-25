---
status: open
classe: presentation
barreira: null
regressao:
  - tests/e2e/laboratory/renderer-lifecycle.spec.ts
---

# Renderer snapshot before mount

## Summary

The match client could receive its initial complete snapshot while `PixiRenderer.mount()` was still loading assets or terrain. The client then attempted presentation before the renderer had initialized, causing the match page to throw instead of showing the first frame.

## Symptom

Opening a match while asset loading was delayed could produce the browser error `PixiRenderer: not mounted`; units were not rendered even though match state and HUD data had arrived.

## Root cause

`useMatchSession` considered the renderer usable immediately after constructing it. It called `present()` from `onSnapshot` without distinguishing the constructed state from the asynchronously completed `mount()` state.

## What we missed

The renderer lifecycle E2E test exercised normal mount timing only. It did not delay manifest loading while the server delivered the initial snapshot, so it never exercised the asynchronous readiness boundary.

## Fix

`apps/web/src/screens/useMatchSession.ts` now retains only the latest complete render frame until `mount()` succeeds, presents it immediately after readiness, and ignores late mount completion after its session is disposed.

## Regression

`tests/e2e/laboratory/renderer-lifecycle.spec.ts` delays the optional manifest response, verifies the renderer eventually exposes units, and asserts that no `PixiRenderer: not mounted` page error occurred.

## Prevention

The lifecycle regression makes delayed renderer initialization a permanent browser-level acceptance condition. Snapshot handling continues to update HUD state immediately while presentation is explicitly gated on renderer readiness.

## Verification

Focused Playwright lifecycle test, static checks, repository verification, browser verification, postmortem status generation, and diff checks are run for this fix.
