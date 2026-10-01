---
status: open
classe: coverage
barreira: QH.02
regressao:
  - tests/unit/web/match-session-runtime.test.ts
  - tests/unit/web/match-interaction-controller.test.ts
---

# Enemy Building Selection And Attack

## Summary

Enemy buildings were visible but could not be selected or attacked by player units. The simulation already supported damaging enemy buildings, but the browser interaction layer discarded the target before sending the command.

## Symptom

Players could not select an enemy construction and right-clicking or selecting attack mode on it produced no attack order.

## Root cause

`selectConstruction` rejected every building whose owner was not player `0`. Separately, `buildingCommand` only implemented deposit, repair, and construction behavior, then returned for completed enemy buildings instead of sending `ATTACK`.

## What we missed

The web selection and interaction tests covered allied building actions and unit combat, but had no acceptance case for an enemy building as a selectable combat target. The existing simulation building-combat test masked the missing client path.

## Fix

Enemy construction selection is now allowed in `match-session-runtime.ts`. `MatchInteractionController.buildingCommand` sends an authoritative `ATTACK` for selected units against completed enemy buildings. Primary attack mode also routes building targets through the same command path.

## Regression

`match-session-runtime.test.ts` verifies that an enemy building is selectable. `match-interaction-controller.test.ts` verifies that selected units produce an `ATTACK` intent targeting an enemy building. Existing simulation combat coverage verifies building damage and destruction.

## Prevention

Future building interactions must distinguish ownership for permitted actions, not for target visibility. Attack authorization remains server-side and rejects same-owner targets, allowing the same path to support bots later.

## Verification

Executed under Node `v24.21.0`:

- `pnpm exec vitest run tests/unit/web/match-session-runtime.test.ts tests/unit/web/match-interaction-controller.test.ts tests/simulation/combat/basic-combat.test.ts` — passed.
- `pnpm --filter @rts/web typecheck` — passed.
- `pnpm exec biome check` on changed TypeScript files — passed.

The exploratory browser test for construction targeting was removed because the current debug/browser scenario did not expose the construction owner consistently and did not provide a deterministic visual target assertion.
