---
status: closed
classe: input-cross-platform
barreira: null
regressao:
  - tests/e2e/match/control-click-attack.spec.ts
---

# Postmortem: Mac Trackpad Cannot Move Units

## Summary

On macOS with a trackpad, two-finger tap and Control+click — the platform-standard right-click gestures — do not issue movement or attack commands in the game. The renderer only listens for the PixiJS `rightdown` event, which requires a physical mouse right-button. The native `contextmenu` event (which trackpad gestures produce) was suppressed but never used as a command source.

## Symptom

On a MacBook trackpad, selecting units works (left-click / tap), but issuing a move, attack, or gather command via two-finger tap or Control+click has no effect. Commands only work with a physical mouse right-click.

## Root cause

The command dispatch handler (`packages/renderer/src/renderer.ts:118-134`) is bound exclusively to the PixiJS `rightdown` event. This event only fires for a physical right-mouse-button press. Trackpad right-click gestures on macOS generate a DOM `contextmenu` event instead, which the renderer suppresses at line 58 (`event.preventDefault()`) without routing it to the command logic.

## What we missed

- No cross-platform input acceptance criterion: the spec never stated "commands must work with trackpad right-click gestures."
- No unit or integration test covering `contextmenu` → command dispatch.
- Manual testing was done only with a physical mouse; trackpad was never validated.

## Fix

Extract the command-dispatch logic into a reusable `dispatchCommand(globalX, globalY)` method, then call it from both the `rightdown` PixiJS event and the native DOM `contextmenu` event on the canvas (`packages/renderer/src/renderer.ts`).

## Regression

A Playwright end-to-end regression (`tests/e2e/match/control-click-attack.spec.ts`) that right-clicks an enemy and asserts the attack lands and the selection is preserved, covering the `contextmenu` → command path. The original inline unit test was removed because it re-implemented the dispatch logic instead of exercising the renderer.

## Prevention

- Acceptance criterion added: "all command inputs must work with mouse right-click, trackpad gestures (two-finger tap, Control+click), and (future) touch."
- Regression test prevents `contextmenu` from being suppressed without command routing.

## Verification

```bash
pnpm run test:e2e tests/e2e/match/control-click-attack.spec.ts --project=chromium
pnpm run lint
```
