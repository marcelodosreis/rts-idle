# Postmortem: Control+Click Selects an Enemy Instead of Attacking

## Summary

On macOS, Control+click on an enemy unit replaced the player's selection with that enemy and issued no attack. The secondary click was treated as a primary click by the unit sprite, so the ATTACK command was sent with the enemy as both issuer and target and was rejected.

## Symptom

With friendly units selected, Control+clicking an enemy did not attack. The selection silently jumped to the enemy unit, and no movement, attack, or gather command took effect for the original selection.

## Root cause

`packages/renderer/src/unit-layer.ts` bound the sprite `pointerdown` handler and called `event.stopPropagation()` unconditionally, then selected the unit whenever `event.button === 0`. On macOS, Control+click is delivered as a primary `pointerdown` (`button === 0`) with `ctrlKey === true` plus a `contextmenu` event. The sprite therefore selected the enemy and stopped propagation. The `contextmenu` handler then dispatched ATTACK using the freshly replaced selection, producing `unitIds: [enemy], targetId: enemy`, which `applyAttack` rejects with `NOT_OWNER` (`packages/simulation/src/commands/attack.ts:27`).

## What we missed

- No acceptance criterion that secondary input must never mutate the selection.
- No end-to-end test that attacks by clicking directly on an enemy without first arming the Attack command. `tests/e2e/hud-commands.spec.ts` armed Attack before right-clicking, so it never exercised the default path.
- The previous trackpad regression test re-implemented `dispatchCommand` inline instead of driving the real renderer, so it could not catch this.

## Fix

- `packages/renderer/src/unit-layer.ts`: only a primary click (`button === 0` without `ctrlKey`/`metaKey`) selects and stops propagation.
- `packages/renderer/src/renderer.ts`: the viewport only starts a selection box on a primary click, and the `rightdown` listener was removed. Command dispatch now has a single source, the canvas `contextmenu` event, which is platform-agnostic and unaffected by PixiJS event propagation.

## Regression

`tests/e2e/control-click-attack.spec.ts`:
- `right-clicking an enemy attacks it and preserves the selection` asserts the enemy's health drops and the original selection is unchanged.
- `Control+click on an enemy does not change the selection` fails before the fix and passes after it.

## Prevention

- Acceptance criterion: secondary-click gestures (mouse right-click, two-finger tap, Control+click) must issue commands and must never alter the selection.
- Single command source (`contextmenu`) removes the dual-path class of bug.
- End-to-end regression drives real browser input instead of duplicating renderer logic.

## Verification

```bash
pnpm run test:e2e tests/e2e/control-click-attack.spec.ts --project=chromium
pnpm run test:e2e tests/e2e/select-and-move.spec.ts --project=chromium
pnpm run test:e2e tests/e2e/hud-commands.spec.ts --project=chromium
pnpm run typecheck
pnpm run lint
pnpm run test:regression
```
