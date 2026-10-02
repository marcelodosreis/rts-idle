---
status: open
classe: presentation
barreira: QH.27.01
regressao:
  - tests/integration/session-commands.test.ts
  - tests/simulation/economy/repair.test.ts
---

# Observation Consolidation Regressions

## Summary

The first observation-boundary migration changed three established behaviors: empty cargo was serialized as `carrying: false`, combat fixtures without a `Kind` component stopped attacking, and mechanical targets were incorrectly rejected by the repair capability check. The regressions were found during focused validation before the consolidation was reported complete.

## Symptom

- Units without cargo exposed `carrying: false` instead of omitting the optional field.
- An attack command produced no damage event in a combat fixture.
- A pawn could not repair a warrior target.

## Root cause

- The new observation projector emitted a boolean for every cargo component instead of preserving the optional wire contract.
- Capability lookup treated an absent `Kind` as unable to attack, while existing fixture semantics use the combat component as sufficient authority.
- `canRepair` was used for both the worker capability and the target's mechanical repairability, although those are distinct concepts.

## What we missed

The migration checklist validated compilation and the new observation shape but did not first run the existing integration and repair suites. It also did not require an explicit distinction between actor capabilities and target capabilities in the unit data contract.

## Fix

- `packages/simulation/src/engine/observation.ts` now omits `carrying` when cargo is empty.
- `packages/game-data/src/units.ts` preserves attacks for component-only combat fixtures and adds the `repairable` target capability.
- Repair command/system validation uses `repairable` for targets and `canRepair` for workers.

## Regression

- `tests/integration/session-commands.test.ts` asserts optional carrying state and attack damage events.
- `tests/simulation/economy/repair.test.ts` asserts deterministic repair of a warrior target and completed mechanical buildings.
- The focused suite passed with 21 tests.

## Prevention

All observation migrations now run the owning integration and simulation suites before broader architecture validation. Capability registries must distinguish producer/actor permissions from target classifications when both participate in the same command.

## Verification

- `corepack pnpm exec vitest run tests/integration/session-commands.test.ts tests/simulation/economy/repair.test.ts tests/simulation/combat/monk-heal.test.ts`: 21 passed.
- `corepack pnpm run verify`: passed.
- Chromium and Firefox `tests/e2e/economy/scenarios.spec.ts`: 10 passed per browser.
