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

A unit test (`tests/unit/renderer-contextmenu-command.test.ts`) that simulates a `contextmenu` DOM event on the canvas and asserts that `onGroundCommand` is called with correctly converted coordinates, and that `preventDefault` is called to suppress the native menu.

## Prevention

- Acceptance criterion added: "all command inputs must work with mouse right-click, trackpad gestures (two-finger tap, Control+click), and (future) touch."
- Regression test prevents `contextmenu` from being suppressed without command routing.

## Verification

```bash
pnpm run test:unit -- --reporter=verbose
pnpm run lint
```
