---
status: open
classe: coverage
barreira: null
regressao:
  - tests/simulation/vision.test.ts
---

# Vision Radius Too Small

## Summary

The first vision-radius tuning interpreted the requested fourfold reduction as
a fourfold reduction of the radius, changing eight tiles to two. That reduced
the visible area by roughly sixteenfold and made the match screen too
restrictive.

## Symptom

After the fog-of-war tuning, the player reported that the visible area was much
too small for normal play.

## Root cause

The product request was expressed as a fourfold vision reduction, but the
implementation applied the factor to the linear radius instead of the visible
area. Radius two was therefore chosen instead of radius four.

## What we missed

The task packet did not explicitly distinguish linear radius from visible area.
The decision should have been confirmed before implementation rather than
assuming which dimension the factor described.

## Fix

The authoritative vision constant is now four tiles, the simulation version is
`0.24.0`, and the canonical hash golden is updated. The circular Euclidean
rule remains unchanged.

## Regression

`tests/simulation/vision.test.ts` asserts the four-tile radius, cardinal and
diagonal boundaries, and the out-of-radius rejection cases.

## Prevention

Future balance requests must state whether a multiplier applies to linear
radius or visible area. The task contract and focused boundary test now pin the
selected linear radius explicitly.

## Verification

- `pnpm exec vitest run tests/simulation/vision.test.ts tests/simulation/hash-golden.test.ts` - 8 passed.
