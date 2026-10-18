---
status: open
classe: coverage
barreira: null
regressao:
  - tests/e2e/match/hud-layout.spec.ts
---

# Fog HUD Selection Observation

## Summary

The mixed-unit HUD layout regression assumed that every unit in the
regression fixture crossed the observation boundary, even though the browser
must only select and display units currently present in the player's snapshot.

## Symptom

The test expected 16 selected-unit chips and eight enemy chips. The initial
player observation contained 15 units: all eight allied units and seven visible
enemy units. The enemy Lancer was outside the player's initial eight-tile
vision.

## Root cause

The test hard-coded authoritative fixture totals instead of deriving its
selection and ownership counts from the filtered unit catalog returned by the
browser debug bridge.

## What we missed

Fog filtering changed the browser-visible unit set, but the HUD layout test
still treated the regression fixture as a complete world-state catalog.

## Fix

The test derives selected, allied, and enemy counts from the observed catalog
while retaining the mixed-owner layout and detail-popover assertions.

## Regression

`tests/e2e/match/hud-layout.spec.ts` verifies every currently observed unit is
rendered once and that ownership counts remain accurate in Chromium and
Firefox.

## Prevention

Browser HUD tests must derive entity counts from observed data. Full-world
fixture totals belong in authoritative simulation tests, not player-facing
observation tests.

## Verification

- `pnpm run test:e2e:focused tests/e2e/match/hud-layout.spec.ts --grep "multiple selection shows every selected unit across three rows" --project=chromium --project=firefox`
- `pnpm run test:e2e:fast`
