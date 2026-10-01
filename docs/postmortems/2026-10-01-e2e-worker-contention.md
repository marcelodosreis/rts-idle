---
status: open
classe: environment
barreira: QH.26.01
regressao:
  - tests/unit/tools/e2e-worker-count.test.ts
---

# E2E worker contention

## Summary

The local functional E2E gate started six Playwright workers by default. Under
that load, real-time match commands intermittently failed to reach the server,
causing production cancellation and attack scenarios to time out.

## Symptom

`pnpm run test:e2e:fast` repeatedly failed 3 of 230 tests under six workers,
while the same scenarios passed in focused runs and in a serial 230-test run.

## Root cause

`playwright.config.ts` left the local worker count undefined, which delegated
the choice to Playwright and selected six workers. The shared local web/server
processes do not provide deterministic real-time behavior under that contention.

## What we missed

The worker policy only constrained CI. The local functional gate had no tested
default concurrency contract.

## Fix

`tools/e2e/worker-count.ts` makes one worker the default for every environment;
`E2E_WORKERS` remains an explicit valid override. `playwright.config.ts` uses it.

## Regression

`tests/unit/tools/e2e-worker-count.test.ts` verifies the serial default, valid
overrides, and invalid-value rejection.

## Prevention

The worker policy is pure, unit-tested, and used by the Playwright config.

## Verification

- Focused affected E2E scenarios pass in Chromium and Firefox.
- `pnpm run verify` passes.
- `pnpm run test:e2e:fast` passes with the safe default.
