---
status: closed
classe: presentation
barreira: QH.28.02
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

The E2E coverage now seeds an authoritative Pawn at the Castle spawn exit,
fills the queue through the real HUD, and observes the stable blocked command
and `Queue is full` feedback. Cancellation remains a separate assertion with
authoritative queue reduction and Gold refund updates.

## Regression

`tests/e2e/economy/production-playable.spec.ts` asserts both the full blocked
queue and queued-row cancellation with confirmation and authoritative refund
updates.

## Prevention

Browser tests for temporal gameplay state must observe stable UI state instead
of forcing commands whose validity can change during the assertion window. The
blocked-queue fixture now holds the authoritative spawn tile so queue progress
cannot invalidate the blocked-state assertion.

## Verification

The focused production suite passed in Chromium and Firefox. The full
functional gate passed 243 tests with one expected skip, and the performance
gate passed 6 tests.
