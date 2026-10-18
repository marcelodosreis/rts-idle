---
status: open
classe: coverage
barreira: null
regressao:
  - tests/e2e/match/selection-box.spec.ts
---

# Fog Selection Box Building

## Summary

The selection-box regression attempted to select the enemy Castle after only
moving the camera to its location. Fog correctly kept the hidden construction
out of the client observation.

## Symptom

The enemy construction panel did not appear after the test dragged a box over
the opponent base. The base had not been observed by player 0.

## Root cause

The test treated camera focus as a visibility source. Player-specific
observations only include the enemy Castle after a controlled unit reveals its
tile.

## What we missed

The selection-box test was written against the previous complete world
projection and did not model the natural reveal interaction required by the
Fog of War contract.

## Fix

The test selects a player worker, moves it to a traversable tile near the enemy
Castle, waits for the Castle to enter the observed construction set, and then
performs the real box-selection interaction.

## Regression

The test continues to verify that the revealed enemy Castle is selectable and
that its train, upgrade, and rally commands remain locked in Chromium and
Firefox.

## Prevention

Browser selection tests must reveal hidden dynamic entities through player
vision before asserting their UI state. Camera movement alone is not evidence
of observation.

## Verification

- `pnpm run test:e2e:focused tests/e2e/match/selection-box.spec.ts --grep "selecting an enemy construction shows its commands as locked" --project=chromium --project=firefox`
- `pnpm run test:e2e:fast`
