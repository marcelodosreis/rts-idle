---
status: closed
classe: presentation
barreira: QH.03
regressao:
  - tests/e2e/laboratory/renderer-lifecycle.spec.ts
---

# Renderer Lifecycle Observation Race

## Summary

The renderer lifecycle E2E intermittently observed authoritative unit positions
before every corresponding sprite body had completed its first presentation.

## Symptom

The lifecycle test found units in `getPositions()` but one sprite state still
reported `inTree: false` or `visible: false`. The failure reproduced once in
five repeated Chromium runs and once during the full browser gate.

## Root cause

The test sampled two debug projections in separate browser evaluations. Match
readiness guarantees the renderer lifecycle, but it does not guarantee that the
latest unit collection and each sprite body are observed in the same callback.

## What we missed

The new QH.03 assertion treated a cross-layer presentation transition as an
immediate invariant. The acceptance test needed to observe the stable invariant
through the existing polling convention instead of assuming the first read was
already settled.

## Fix

`tests/e2e/laboratory/renderer-lifecycle.spec.ts` now polls the complete
`inTree && visible` invariant for the current unit set. It does not add a sleep,
force a frame, or change renderer behavior.

## Regression

The lifecycle test remains the permanent regression and verifies every currently
projected unit body is present and visible after mount.

## Prevention

Presentation invariants that span authoritative snapshots and renderer objects
must use state polling with a bounded timeout. QH.03 now records this invariant
in the existing renderer lifecycle barrier.

## Verification

The focused Chromium lifecycle test passed five repeated runs, the focused
Chromium/Firefox lifecycle suite passed 8 tests, `pnpm run verify` passed, and
the full functional and performance browser gates passed.
