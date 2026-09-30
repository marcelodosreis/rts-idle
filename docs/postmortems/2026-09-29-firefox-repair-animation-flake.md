---
status: open
classe: presentation
barreira: QH.12
regressao:
  - tests/e2e/economy/scenarios.spec.ts
---

# Firefox Repair Animation Flake

## Summary

The regression economy scenario intermittently failed in Firefox while checking
the worker animation immediately after issuing a repair command. The repair
flow itself completed correctly, but the test required a short-lived movement
animation that could already have transitioned to the interaction animation by
the time Firefox exposed the next browser observation.

## Symptom

The browser test expected `repair_run` and received `repair_interact`. The
failure reproduced intermittently in Firefox and did not indicate a simulation
or command-path failure.

## Root cause

The E2E assertion encoded a timing-specific intermediate state. The worker may
reach the damaged Base before the polling callback observes the first render
state, especially under Firefox scheduling and asset loading. Once at the Base,
`repair_interact` is the correct animation.

## What we missed

The test treated an intermediate presentation state as mandatory instead of
asserting the stable behavior contract: a repair animation is shown and the
worker transitions to interaction at the target. Cross-browser polling timing
was not included in the acceptance of the animation assertion.

## Fix

Updated `tests/e2e/economy/scenarios.spec.ts` to accept either
`repair_run` or `repair_interact` immediately after the command, while keeping
the later exact `repair_interact` assertion after the worker reaches the Base.

## Regression

The repaired browser scenario remains co-located in
`tests/e2e/economy/scenarios.spec.ts`. It verifies the repair animation,
increased building health, interaction animation at the target, and completion
at full health.

## Prevention

Presentation tests must assert observable behavior and stable transitions, not
browser-scheduler-dependent transient frames. The simulation and renderer unit
tests continue to cover the deterministic `repairing + moving` and
`repairing + stationary` animation mapping.

## Verification

Commands run:

- `corepack pnpm run test:e2e -- --project=firefox --workers=1 tests/e2e/economy/scenarios.spec.ts --grep "repairs its damaged Base" --repeat-each=5` reproduced the timing flake before the fix.
- Focused Chromium and Firefox E2E verification passed after the fix.
