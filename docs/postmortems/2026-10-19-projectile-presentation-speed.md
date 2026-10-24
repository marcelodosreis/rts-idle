---
status: open
classe: presentation
barreira: QH.19
regressao:
  - tests/simulation/combat/basic-combat.test.ts
  - tests/unit/renderer/projectile-layer.test.ts
---

# Projectile Presentation Speed and Direction

## Summary

The first projectile presentation slice made Archer arrows travel too quickly
for a readable player-facing effect and rendered them with a fixed right-facing
orientation. The readability adjustment was later tuned from `6` to `10`
tiles/s after player feedback while retaining the direction fix.

## Symptom

In the projectiles scenario, an arrow crossed a short two-tile path in roughly
150 milliseconds and remained visually horizontal even when the target was
above, below, or diagonal to the Archer.

## Root cause

The authoritative projectile definition used `16 tiles/s`, which is `0.8 tile`
per 20 Hz simulation tick. `ProjectileLayer` drew the fallback along the
positive X axis and never updated the display rotation. Loaded arrow sprites
also replaced the fallback without copying its current transform.

## What we missed

The initial tests covered lifecycle, serialization, and browser event feedback,
but did not assert readable flight duration or presentation orientation from
observed position changes.

## Fix

Reduce the authoritative Archer projectile speed to `10 tiles/s`. Derive the
presentation angle from consecutive observed positions, apply it to both the
fallback and loaded asset, and preserve position and rotation during asset
replacement.

## Regression

Simulation coverage asserts the configured movement rate delays impact for the
expected number of ticks. Renderer coverage asserts a diagonal observed segment
rotates the projectile to `atan2(deltaY, deltaX)`.

## Prevention

Projectile acceptance coverage now treats readable travel duration and direction
as player-facing behavior, while keeping target identity and homing data private
to the authoritative simulation.

## Verification

- `pnpm exec vitest run tests/simulation/combat/basic-combat.test.ts tests/unit/renderer/projectile-layer.test.ts`
- `pnpm run verify`
- Chromium and Firefox projectile E2E scenario
