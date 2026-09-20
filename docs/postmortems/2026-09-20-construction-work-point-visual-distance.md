---
status: open
classe: presentation
barreira: null
regressao:
  - tests/unit/placement.test.ts
  - tests/simulation/building-construction.test.ts
---

# Construction Work Points Used Competing Side Policies

## Summary

Construction work points selected a side using two different rules: cardinal
workers used geometric distance, while diagonal workers used a directional
`outsideSide` shortcut.

## Symptom

A diagonal worker could be sent to TOP or BOTTOM even when LEFT or RIGHT was
closer, causing an unnecessary route around a construction corner.

## Root cause

`constructionWorkPoint()` first selected `outsideSide` for workers outside a
footprint, then used nearest-distance selection only for workers not matched by
that shortcut. The two policies could disagree for diagonal positions.

## What we missed

The nearest-edge regression covered cardinal positions and map boundaries but
did not assert a diagonal where direction and distance disagree, nor a genuine
equal-distance tie.

## Fix

All four candidates now come from one side-rule table with a normal axis and
minimum/maximum edge. Each uses the same tangential center, map clamp, and
`tilesToFixed` conversion. Selection always uses `distSquaredFixed`; declaration
order retains TOP → RIGHT → BOTTOM → LEFT as the deterministic tie-break.

## Regression

`tests/unit/placement.test.ts` covers the four cardinal sides with the same
geometry, both diagonal disagreements, a genuine tie, and all map borders.
The simulation regression in `tests/simulation/building-construction.test.ts`
continues to assert the persisted work point used by a BUILD order.

## Prevention

Construction work-point tests now treat every side as the same geometric
contract and include diagonal distance selection. Future changes must preserve
that single authority without changing the BUILD order or snapshot format.

## Verification

Under Node `v24.21.0`, focused placement and construction tests passed and
`pnpm run verify` passed. The original claim that the enumerated focused
`building-hud.spec.ts` run passed 4/4 was inaccurate: CI run `35537655750`
failed `tests/e2e/building-hud.spec.ts:102` on a stale work-point assertion.
See `2026-09-20-construction-e2e-stale-work-point-assertion.md` for the
correction and `pnpm run verify:browser`.
