---
status: open
classe: formation
barreira: tests/e2e/economy/scenarios.spec.ts
regressao: tests/e2e/economy/scenarios.spec.ts
---

# Offensive demo enemies never marched after vision-based targeting

## Summary

The P3.09 targeting change made `ATTACK` orders pursue only through known
coordinates. The offensive demo seeded `ATTACK` orders on targets the enemies
had never seen, so they stood at spawn forever and never damaged a player pawn.

## Symptom

`tests/e2e/economy/scenarios.spec.ts` "offensive regression enemies eventually
damage a player pawn" timed out; enemy positions remained at their spawn tiles
for the whole match.

## Root cause

`seedAttacks` in `apps/server/src/content/demo/demo-session.ts` seeded
`{ type: 'ATTACK', targetId }` orders directly. After P3.09, an attack order on
a target without a remembered position has no coordinates to chase, so the
combat system intentionally does not reveal or pursue it.

## What we missed

The offensive browser test was not run as part of the P3.09 slice because CI
was unavailable (billing), and the seeded-order assumption was not audited when
visibility-based targeting landed.

## Fix

Seed enemy aggression as `ATTACK_MOVE` toward the target's authored position.
Enemies now march into vision and acquire targets naturally; the player units
remain idle.

## Regression

`tests/e2e/economy/scenarios.spec.ts` fails without the fix (enemies never
damage the pawn) and passes with it in Chromium and Firefox.

## Prevention

The scenario browser suite is part of the functional CI matrix; keep the
offensive flow in it and run it whenever targeting or orders change.

## Verification

- `pnpm run test:e2e:focused tests/e2e/economy/scenarios.spec.ts --project=chromium --project=firefox`
- `pnpm run verify`
