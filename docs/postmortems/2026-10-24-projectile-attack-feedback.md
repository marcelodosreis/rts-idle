---
status: open
classe: presentation
barreira: QH.19
regressao:
  - tests/unit/renderer/effects-layer.test.ts
---

# Projectile Attack Feedback

## Summary

During P3.10.01 implementation, removing the old attack streak to avoid a duplicate Archer trajectory also removed instant attack feedback from Pawn, Warrior, and Lancer attacks.

## Symptom

Non-projectile attacks still dealt damage and animated the attacker, but no longer showed the short attacker-to-target streak.

## Root cause

`EffectsLayer` stopped handling every `attackFired` event instead of suppressing only an `attackFired` immediately paired with `projectileLaunched`.

## What we missed

The initial renderer regression asserted that Archer launches had no streak, but did not preserve the pre-existing instant-attack feedback contract.

## Fix

`packages/renderer/src/effects/layer.ts` now retains streaks for instant attacks and suppresses only launch-paired projectile attacks.

## Regression

`tests/unit/renderer/effects-layer.test.ts` separately asserts retained instant feedback and no duplicate Archer streak.

## Prevention

Renderer event changes now cover both the replaced behavior and every unaffected attack producer.

## Verification

- `pnpm exec vitest run tests/unit/renderer/effects-layer.test.ts`
