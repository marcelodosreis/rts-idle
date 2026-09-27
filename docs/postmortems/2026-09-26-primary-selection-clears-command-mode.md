---
status: open
classe: presentation
barreira: QH.25
regressao: [tests/unit/web/create-world-interaction-handler.test.ts]
---

# Primary Selection Did Not Clear Pending Command Mode

## Summary

Clicking the battlefield with the left mouse button after arming Attack-move
changed the selection but left the command hint visible and the Attack-move
button highlighted.

## Symptom

The player selected a pawn, armed Attack-move, then left-clicked the ground to
deselect it. The selected-unit card disappeared, but the command card and the
active Attack-move state remained visible.

## Root cause

`handlePrimary` updated the selection without calling `commandModes.clear`.
Pending modes were only cleared after targeted commands, cancellation, or
other explicit mode actions.

## What we missed

The interaction tests covered right-click command completion but did not cover
left-click selection changes while a pending command mode was armed.

## Fix

Primary unit, building, mineral, and ordinary ground selection now clear the
pending command mode in `create-world-interaction-handler.ts`.

## Regression

`tests/unit/web/create-world-interaction-handler.test.ts` verifies that a
primary ground click clears the mode before updating the selection.

## Prevention

The selection interaction regression is co-located with the web interaction
handler tests and protects the invariant that a new primary selection cancels
the previous pending command target.

## Verification

Focused unit test, web typecheck, Biome, and the repository verification gate
must pass before closure.
