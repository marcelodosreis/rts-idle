---
status: open
classe: coverage
barreira: QH.27.01
regressao:
  - tests/e2e/match/projectiles-playable.spec.ts
---

# Projectile Expiry Scenario Range

## Summary

The first P3.10.01 dead-target browser fixture placed the instant attacker outside its attack range, so the projectile impacted before the attacker could kill the target.

## Symptom

Chromium observed the second projectile launch but timed out waiting for expiry feedback because the projectile produced impact feedback instead.

## Root cause

The Warrior started two tiles from the expiry target while its authoritative range is one tile. Its ATTACK command became pursuit rather than same-tick damage.

## What we missed

The scenario geometry was chosen visually without checking the authoritative unit range contract used by the intended same-tick multi-attacker interaction.

## Fix

`apps/server/src/content/demo/scenarios.ts` now spawns the Warrior one tile from the low-health expiry target.

## Regression

`tests/e2e/match/projectiles-playable.spec.ts` requires renderer-observed expiry feedback after the natural Archer-and-Warrior attack.

## Prevention

Authored combat fixtures must derive their geometry from authoritative range behavior and prove the intended lifecycle outcome.

## Verification

- `pnpm run test:e2e:focused tests/e2e/match/projectiles-playable.spec.ts --project=chromium --workers=1`
- `pnpm run test:e2e:focused tests/e2e/match/projectiles-playable.spec.ts --project=firefox --workers=1`
