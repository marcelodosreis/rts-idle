---
status: open
classe: coverage
barreira: QH.20
regressao:
  - tests/e2e/laboratory/editor/terrain-editor.spec.ts
---

# Editor Playtest Used an Incompatible Scenario

## Summary

The terrain editor Playtest opened its authored map with the default gameplay
scenario. The editor's initial terrain places one default enemy spawn on water,
so the server rejected the match before the browser exposed its debug bridge.

## Symptom

The Playtest browser test opened `/?map=local` successfully but waited forever
for `window.__rtsDebug`. The match page showed `scenario spawn is outside or on
invalid terrain` in the server log and no playable session was created.

## Root cause

The editor map is a terrain-authoring fixture with water and elevated regions,
while the default scenario includes fixed unit and Base placements intended for
the competitive map. The Playtest bridge did not select a scenario whose
spawns are compatible with the editor's initial terrain.

## What we missed

The Playtest E2E asserted only the local-map query and debug bridge. It did not
assert which scenario the editor launched, and the editor's initial map was not
validated against the default scenario after the map geometry changed.

## Fix

The editor Playtest URL now selects the building-free `ffa` scenario while
preserving `map=local`. Its spawns are compatible with the editor's initial
terrain. The E2E regression asserts that scenario selection and then verifies
the authored map reaches the real match debug bridge.

## Regression

`tests/e2e/laboratory/editor/terrain-editor.spec.ts` asserts that Playtest
opens `?map=local&scenario=ffa`, initializes the match, marks it as a local
playtest, and preserves the placed decoration.

## Prevention

The Playtest flow now has an explicit scenario contract rather than relying on
the default scenario's competitive-map placements. The browser regression stays
in the Laboratory functional E2E gate.

## Verification

The focused terrain-editor Chromium test is run after the fix, followed by the
functional E2E gate, repository verification, and the original Playtest flow.
