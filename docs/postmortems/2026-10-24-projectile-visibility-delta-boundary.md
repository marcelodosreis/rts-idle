---
status: open
classe: coverage
barreira: QH.19
regressao:
  - tests/unit/server/snapshot-sender.test.ts
---

# Projectile Visibility Delta Boundary

## Summary

The P3.10 review found no server regression for a known projectile crossing from visible to hidden and back into visibility.

## Symptom

A future delta change could leak hidden projectile coordinates or lifecycle events, omit removal, or reintroduce private homing fields without failing server tests.

## Root cause

Snapshot sender coverage exercised launch, removal, and periodic baselines, but not both directions of the player-visibility boundary.

## What we missed

The wire acceptance tests did not reconstruct the known-ID transition when a projectile passes through a gap between two owned vision circles.

## Fix

No server behavior changed. A public `GameSession` fixture now drives an arrow through visible, hidden, and visible regions.

## Regression

`tests/unit/server/snapshot-sender.test.ts` proves hidden removal without upsert/event and safe reappearance with exactly `id`, `kind`, `owner`, `x`, and `y`.

## Prevention

Visibility-filtered delta entities now require disappearance and reappearance coverage at the transport boundary.

## Verification

- `pnpm exec vitest run tests/unit/server/snapshot-sender.test.ts`
- `pnpm run test:unit`
- `pnpm run test:architecture`
