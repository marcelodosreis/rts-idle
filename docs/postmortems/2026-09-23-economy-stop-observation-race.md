---
status: open
classe: completion-gate
barreira: null
regressao:
  - tests/e2e/economy/economy-playable.spec.ts
---

# Economy Stop Observation Race

## Symptom

The functional E2E gate intermittently observed a worker moving after the Stop
button test had captured its position.

## Root Cause

The test captured the position immediately after clicking Stop, before the
browser had rendered the authoritative cleared economy status. The simulation
could therefore process a final movement tick between the capture and the
subsequent assertion.

## What We Missed

The test waited a fixed 700 milliseconds instead of synchronizing the snapshot
with the visible authoritative transition that indicates the stop command was
applied.

## Fix

The test waits for the economy status to become empty before capturing the
stopped position and checking that it remains stable.

## Regression

`tests/e2e/economy/economy-playable.spec.ts` covers the Stop transition and verifies
that both position and minerals remain unchanged after the command is applied.

## Prevention

Timing-sensitive browser tests must wait on authoritative state transitions,
not fixed delays, before taking observations used for exact assertions.

## Verification

- `pnpm run test:e2e:focused tests/e2e/economy/economy-playable.spec.ts`
- `pnpm run test:e2e:fast`
