---
status: open
classe: coverage
barreira: null
regressao:
  - tests/e2e/match/selection-box.spec.ts
---

# Fog Selection Box Resource

## Summary

The selection-box resource regression focused the camera on a tree and tried
to select it without first revealing the resource to player 0.

## Symptom

The tree resource panel was absent after the box drag because the resource was
not in the filtered observation or renderer resource layer.

## Root cause

The test relied on camera position as if it made map resources visible. Fog
visibility is driven by player-owned units and buildings, not the camera.

## What we missed

The selection-box suite was not updated with the natural reveal requirement
already applied to the economy gathering flow.

## Fix

The test moves a player worker to a nearby traversable tile, waits for active
resource visuals, and then performs the existing box-selection interaction.

## Regression

The real-server tree selection flow continues to assert the Tree resource panel
and empty unit selection in Chromium and Firefox.

## Prevention

Resource-selection browser tests must reveal the resource through a unit or
building before asserting its player-facing context panel.

## Verification

- `pnpm run test:e2e:focused tests/e2e/match/selection-box.spec.ts --grep "box-selecting a tree shows it in the current context" --project=chromium --project=firefox`
- `pnpm run test:e2e:fast`
