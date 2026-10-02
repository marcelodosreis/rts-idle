---
status: open
classe: coverage
barreira: QH.23
regressao: [tests/fuzz/command-stream.test.ts, tests/simulation/combat/monk-heal.test.ts]
---

# HEAL Command Dispatch Regression

## Summary

The seeded command-stream property test found that a `HEAL` command could throw an unsupported-intent error instead of following the authoritative command rejection path.

## Symptom

Fuzzing a valid command stream containing `HEAL` terminated the simulation with `applyCommand: unsupported intent`.

## Root cause

The command classifier placed `HEAL` in the primary command union, but its exhaustive classification switch did not mark it as primary, so it reached the secondary dispatcher where no `HEAL` case exists.

## What we missed

The command dispatch coverage was not generated from every registered command type, so an exhaustive registry check did not exercise the handler routing boundary.

## Fix

Added `HEAL` to the primary branch of `isSecondaryCommand` in `packages/simulation/src/commands/apply-command.ts`, allowing the existing primary dispatcher and `applyHeal` handler to run.

## Regression

The seeded property in `tests/fuzz/command-stream.test.ts` now generates `HEAL` alongside all registered commands and requires deterministic results without uncaught dispatch errors. `tests/simulation/combat/monk-heal.test.ts` covers the accepted gameplay path.

## Prevention

The fuzz command generator and fixed seed continuously exercise every registered command family, including valid and invalid `HEAL` paths.

## Verification

`pnpm run fuzz` and the focused simulation command tests pass after the routing fix.
