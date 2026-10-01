---
status: open
classe: presentation
barreira: QH.25
regressao:
  - tests/e2e/economy/building-hud.spec.ts
---

# Toast Scope Window Binding

## Summary

The new match-scoped toast lifecycle caused construction-completion notifications to disappear in the browser. This blocked visible completion feedback after a House finished construction.

## Symptom

`House capacity activates only after construction completes` reached the completed authoritative state and updated supply, but could not find the `Construction complete` toast.

## Root Cause

`createMatchToastScope()` passed `window.setTimeout` and `window.clearTimeout` as detached methods. The toast scope invoked them through its dependency object, so they no longer had the `Window` receiver required by the browser API.

## What We Missed

The new lifecycle unit tests used plain callback fakes and did not exercise browser-bound timer methods. The existing construction E2E exposed the integration failure only after the refactor.

## Fix

`apps/web/src/shared/ui/toast.tsx` now supplies wrapper functions that invoke `window.setTimeout` and `window.clearTimeout` on `window`.

## Regression

`tests/e2e/economy/building-hud.spec.ts` asserts that a completed House produces the player-visible construction-complete toast. It fails with detached browser timer methods and passes with the wrappers.

## Prevention

Match toast lifecycle changes require the construction completion browser flow in addition to scope unit tests, so browser API receiver binding is covered at the integration boundary.

## Verification

- `pnpm run test:e2e:focused tests/e2e/economy/building-hud.spec.ts --project=chromium --workers=1 --grep "House capacity"`
- Focused Chromium and Firefox HUD, economy, scenario, research, and responsive E2E matrix
