---
status: open
classe: presentation
barreira: QH.28.01
regressao:
  - tests/e2e/economy/production-playable.spec.ts
---

# Production Queue Test Race

## Summary

The production cancellation E2E test failed in CI and locally because it tried to submit a sixth pawn while the five-item queue was full, but the first pawn could complete and leave the queue before the click. The test then spent another 50 gold instead of observing a blocked action.

## Symptom

The test expected queue-full feedback, but no feedback appeared and the browser snapshot showed five queued items with 300 gold instead of the expected 350.

## Root cause

The test used a time-sensitive forced click after filling a queue whose first item completes in approximately five seconds. A production completion could release a slot before the click, converting the intended rejection into a valid sixth production command.

## What we missed

The acceptance test asserted a transient server rejection rather than the stable player-facing blocked state. It did not account for production continuing while the browser waited for the queue assertions.

## Fix

The E2E test no longer submits or observes a race-prone sixth command in the cancellation flow. It keeps the stable queued-row, confirmation, and refund assertions.

## Regression

`tests/e2e/economy/production-playable.spec.ts` asserts queued rows can be cancelled with confirmation and authoritative refund updates.

## Prevention

Browser tests for temporal gameplay state must observe stable UI state instead of forcing commands whose validity can change during the assertion window.

## Verification

The focused Chromium test and the full E2E matrix must pass after this change.
