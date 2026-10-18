---
status: open
classe: coverage
barreira: null
regressao:
  - tests/e2e/match/vision-memory-playable.spec.ts
---

# Fog E2E Vision Source

## Summary

The new real-server fog-of-war E2E failed because it expected no enemy units
after moving to an unexplored region, while the selected regression fixture had
an allied House whose vision legitimately exposed several enemy units. The
failure was limited to the test expectation; server-side visibility filtering
was behaving according to the approved eight-tile vision contract.

## Symptom

The Chromium run of `vision-memory-playable.spec.ts` failed when the test
asserted that every observed unit belonged to player 0. Enemy units with IDs
9-15 were present in the client observation.

## Root cause

The `regression` scenario places the player House at tile `(16, 10)` and enemy
units at tiles `(18..21, 17..18)`. The House's eight-tile circular vision
legitimately includes units 9-15, independent of the moving unit's destination.
The original destination `(5, 25)` was also inside the map's tree band and was
not a reliable traversable movement target. The E2E treated the moving unit as
the only allied vision source and did not validate the destination geometry.

## What we missed

The browser acceptance test did not verify the complete fixture geometry before
asserting hidden-entity absence or movement completion. The scenario contained
a second vision source close to the enemy group, and the chosen destination was
on a special map band, so the test was not isolated to the interaction it
intended to cover.

## Fix

The E2E now uses the `default` passive scenario and a traversable destination
at tile `(5, 20)`, whose enemy group is outside the player's starting and
destination vision sources. It retains the same reveal interaction and checks
the resulting observed unit owners without changing the simulation or
transport filtering.

## Regression

`tests/e2e/match/vision-memory-playable.spec.ts` asserts in Chromium and
Firefox that the target tile starts unknown, becomes visible and explored after
the move, and that the real-server observation contains only player-owned
units in the isolated fixture.

## Prevention

Vision E2E fixtures must isolate the tested vision source from unrelated allied
buildings or units. Future hidden-entity assertions should be derived from the
fixture's authoritative placements and must account for every source that can
reveal the target area.

## Verification

- `pnpm run test:e2e:focused tests/e2e/match/vision-memory-playable.spec.ts --list`
- `pnpm run test:e2e:focused tests/e2e/match/vision-memory-playable.spec.ts --project=chromium --project=firefox`
- `pnpm exec vitest run tests/unit/server/snapshot-sender.test.ts tests/simulation/vision.test.ts`
