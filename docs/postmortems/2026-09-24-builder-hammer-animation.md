---
status: open
classe: presentation
barreira: null
regressao:
  - tests/unit/unit-economy.test.ts
  - tests/integration/session-commands.test.ts
  - tests/e2e/building-hud.spec.ts
---

# Builder Used Idle Sprite During Construction

## Summary

A pawn assigned to construct a building used the idle sprite at its work point
because the authoritative BUILD order was not represented in the renderer state.

## Symptom

While construction was progressing, the pawn did not show the
`pawn_interact_hammer` animation.

## Root cause

The server projected BUILD as `idle` after movement stopped. The protocol had no
building order state, and the renderer neither loaded nor selected the existing
hammer asset.

## What we missed

Construction simulation tests verified work-point movement and progress, but no
projection or browser test asserted the builder's visual state.

## Fix

BUILD now projects `moving` while travelling and `building` at the work point.
The renderer loads the pawn hammer strip and selects it while the building
state is authoritative.

## Regression

Unit tests cover the hammer key and frame selection, integration tests cover the
`moving` to `building` projection, and the construction E2E asserts `build` when
art assets are available.

## Prevention

The builder state is now part of the typed snapshot contract and the visual
asset path is covered at unit, integration, and browser boundaries.

## Verification

Focused renderer/integration tests, `verify`, and the functional browser gate
will be run for this change.
