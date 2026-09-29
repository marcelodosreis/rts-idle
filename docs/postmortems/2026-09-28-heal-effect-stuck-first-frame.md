---
status: open
classe: presentation
barreira: QH.19
regressao:
  - tests/unit/renderer/heal-effect-animation.test.ts
---

# Heal Effect Stuck on First Frame

## Symptom

The Monk healed the target, but the target's `heal_effect` remained on its first
sprite frame instead of animating through the effect.

## Root cause

The heal effect was a separate `AnimatedSprite` attached to the target unit.
The renderer's manual animation tick only called `update()` on the unit's main
body sprite, so the visible effect never advanced.

## What we missed

The implementation validated that the effect was loaded and visible, but did
not test animation advancement for auxiliary sprites attached to a unit.

## Fix

`UnitSprite.advanceAnimation()` now updates the visible heal-effect sprite in
addition to the unit body. The effect is reset and played from frame zero for
each `healCast` event.

## Regression

`tests/unit/renderer/heal-effect-animation.test.ts` constructs a target with a
multi-frame heal effect, triggers it, advances the renderer ticker, and asserts
that the effect leaves frame zero.

## Prevention

Renderer tests for future auxiliary unit animations must verify both attachment
and advancement under the renderer's manual ticker.

## Verification

- `pnpm exec vitest run tests/unit/renderer/heal-effect-animation.test.ts`
- `pnpm run verify`
- Monk Heal E2E in Chromium and Firefox
