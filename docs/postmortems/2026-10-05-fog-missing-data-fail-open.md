---
status: open
classe: coverage
barreira: null
regressao:
  - tests/unit/renderer/fog-layer.test.ts
---

# Fog Missing Data Fail-Open

## Summary

The renderer hid the fog layer when a frame did not contain a visibility
projection, which exposed the entire static map before authoritative vision data
arrived. This violated the fail-closed fog contract.

## Symptom

Calling `FogLayer.present(undefined)` made the fog container invisible instead
of covering the map with unknown-state tiles.

## Root cause

The missing-data branch treated an absent fog projection as a legacy rendering
case and disabled the layer. It did not distinguish compatibility with safe
presentation of untrusted or incomplete visibility data.

## What we missed

The initial renderer test asserted that the layer became hidden for a missing
projection. That expectation contradicted the approved P3.08.02 requirement
that missing or invalid visibility data fail closed to unknown presentation.

## Fix

`FogLayer` now accepts the map dimensions, initializes its tiles as unknown,
and keeps them visible with the unknown alpha whenever the projection is absent.
The match renderer supplies the authoritative map dimensions from `MatchConfig`.

## Regression

`tests/unit/renderer/fog-layer.test.ts` verifies that an absent projection
keeps the fog visible and covers the initial tile as unknown.

## Prevention

The renderer contract and unit regression now explicitly require fail-closed
handling for missing visibility data. Fog presentation remains a pure projection
of the server observation and cannot reveal the map by omission.

## Verification

- `pnpm exec vitest run tests/unit/renderer/fog-layer.test.ts`
- `pnpm run verify`
