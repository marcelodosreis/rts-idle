---
status: open
classe: completion-gate
barreira: null
regressao:
  - tests/e2e/building-hud.spec.ts
---

# Construction E2E Asserted the Wrong Work-Point Edge

## Summary

The Chromium E2E `construction stays at the clicked location while the worker
travels` asserted the worker stopped at tile `(11,11)`, but the nearest-edge
work-point authority deterministically selects tile `(10,10)` for that worker
and footprint. The test never passed against the shipped work-point logic, so
the `End-to-End Tests` job failed on the `fix/construction-work-point-authority`
pull request.

## Symptom

CI run `35537655750` reported, at `tests/e2e/building-hud.spec.ts:102`:

```
Expected: { x: 2816, y: 2816 }   // tile (11,11)
Received: { x: 2560, y: 2560 }   // tile (10,10)
```

All other jobs (lint/typecheck, unit, simulation/contracts/orders/invariants,
determinism/architecture) passed.

## Root cause

The worker spawns at `(8,11)` and the BASE footprint is `(10,9)` with a 2×2
size. `constructionWorkPoint()` compares the squared distance from the worker
to the four side candidates: TOP `(11,9)`, RIGHT `(12,10)`, BOTTOM `(11,11)`,
LEFT `(10,10)`. The squared distances are LEFT `5`, BOTTOM `9`, TOP `13`,
RIGHT `17`, so LEFT `(10,10)` wins. The assertion was authored by intuition
("the worker is below the building, so it stops below it") instead of deriving
the value from the nearest-edge contract, and it therefore encoded BOTTOM.

## What we missed

The regression test for the work-point change was added in the same commit as
the fix but its expected value was never validated against the algorithm. The
postmortems `2026-09-20-construction-nearest-edge` and
`2026-09-20-construction-work-point-visual-distance` recorded that the focused
`building-hud.spec.ts` run passed 4/4, but that verification was not actually
executed against the final assertion. Focused E2E execution is a delivery gate
and was reported as green without evidence.

## Fix

`tests/e2e/building-hud.spec.ts:102` now asserts
`{ x: tilesToFixed(10), y: tilesToFixed(10) }`, matching the nearest-edge
work-point authority already covered by `tests/unit/placement.test.ts` and
`tests/simulation/building-construction.test.ts`. No product code changed.

## Regression

The corrected assertion in `tests/e2e/building-hud.spec.ts` fails against the
BOTTOM expectation and passes against the real nearest-edge behavior, so it
pins the worker destination for this exact worker/footprint geometry.

## Prevention

Work-point assertions must be derived from `constructionWorkPoint()` (or from a
focused simulation/unit test) rather than hand-picked tiles. Focused E2E
execution is required before claiming verification in a postmortem; a green
claim without a recorded command and result is a process violation.

## Verification

Under Node `v24.21.0`: `pnpm run test:e2e:focused tests/e2e/building-hud.spec.ts`
passed 4/4, `pnpm run verify` passed, and `pnpm run verify:browser` passed.
