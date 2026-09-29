---
status: open
classe: presentation
barreira: QH.17
regressao:
  - tests/unit/renderer/ping.test.ts
---

# Rally Ping Expiry

## Summary

The rally shortcut displayed a command ping at the last clicked position,
instead of showing only the selected construction's authoritative rally point.
This made different producer rally points indistinguishable and left stale
feedback visible after changing selection.

## Symptom

After selecting a different producer, the visible feedback could represent the
previous command click rather than that producer's rally point.

## Root cause

The renderer treated a rally command click as a generic command ping. The
transient ping had no association with the selected producer or its snapshot
`rallyPoint`.

## What we missed

The P2.09 acceptance contract did not explicitly say that rally feedback must
come only from the selected construction's authoritative `rallyPoint`.

## Fix

The renderer no longer creates a command ping for rally clicks. Selecting a
producer hides transient command feedback, and the interaction-layer marker is
positioned from only that producer's authoritative rally point.

## Regression

`tests/unit/renderer/ping.test.ts` verifies the selected rally marker remains
visible after the transient lifetime has elapsed.

## Prevention

The selected-producer-only requirement is now part of `docs/tasks/P2.09.md` and
is enforced by renderer tests.

## Verification

The focused renderer test, project verification gate, and production browser
flow are run as part of the task completion validation.
