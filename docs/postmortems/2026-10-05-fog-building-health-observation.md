---
status: open
classe: coverage
barreira: null
regressao:
  - tests/e2e/economy/scenarios.spec.ts
---

# Fog Building Health Observation

## Summary

The completed-building health E2E expected the client debug projection to
contain every building in the regression fixture after player-specific
observation filtering was enabled.

## Symptom

The Chromium test received two health-bearing buildings instead of three: the
player Castle at 250/500 HP and the visible House at 250/250 HP. The opponent
Castle was outside the player's initial vision and was correctly absent.

## Root cause

The test read `window.__rtsDebug.getConstructionStates()`, which is backed by
the current filtered snapshot. Its previous expectation encoded authoritative
world-state access rather than player-visible state.

## What we missed

The existing building-health regression was not updated when the browser debug
bridge moved from complete snapshots to player-specific observations. It did
not distinguish a visible building-health assertion from a hidden-entity
absence assertion.

## Fix

The test now asserts the two visible health projections and renames the case to
make its observation boundary explicit. The hidden opponent Castle remains
absent from the client projection.

## Regression

`tests/e2e/economy/scenarios.spec.ts` checks visible completed Castle and House
health through the real server in Chromium and Firefox while preserving the
filtered observation contract.

## Prevention

Browser debug assertions must use the same visibility boundary as the player
screen. Tests that need authoritative hidden state belong in simulation or
server suites, not in the browser debug bridge.

## Verification

- `pnpm run test:e2e:focused tests/e2e/economy/scenarios.spec.ts --grep "regression projects visible completed building health" --project=chromium --project=firefox`
- `pnpm run test:e2e:fast`
