---
status: open
classe: coverage
barreira: QH.19
regressao:
  - tests/simulation/combat/projectiles.test.ts
---

# Projectile Homing And Remainder Coverage

## Summary

The P3.10 review found that moving-target homing and restored flight with a nonzero private movement remainder were not proven by simulation tests.

## Symptom

Regressions in live target tracking or canonical remainder persistence could pass while stationary-target and zero-remainder tests stayed green.

## Root cause

The projectile suite used only stationary targets and the Arrow's production speed, which divides evenly by the tick rate and therefore starts on the zero-remainder path.

## What we missed

Acceptance coverage named homing and fixed-point remainders but did not force either branch through deterministic command and snapshot/restore tests.

## Fix

No production API changed. The simulation regression moves a target through commands and seeds a nonzero remainder only in a private pre-construction test state.

## Regression

`tests/simulation/combat/projectiles.test.ts` proves deterministic homing and snapshot/restore-equivalent advancement with remainder `7`.

## Prevention

Deterministic state fields with inactive production values require an internal fixture branch test without exposing mutation publicly.

## Verification

- `pnpm exec vitest run tests/simulation/combat/projectiles.test.ts`
- `pnpm run test:simulation`
- `pnpm run test:determinism`
