---
status: open
classe: coverage
barreira: QH.20
regressao:
  - tests/unit/web/match-interaction-controller.test.ts
  - tests/e2e/economy/economy-playable.spec.ts
---

# Repair Took Precedence over Deposit

## Summary

The P2.10 repair interaction caused the functional E2E pipeline to fail after
the regression scenario began with a damaged player Base. A carrying worker
right-clicking that Base was assigned REPAIR instead of DEPOSIT, so the worker
never delivered its cargo and the functional suite eventually timed out.

## Symptom

Economy browser tests could not observe Mining or Returning status and could not
complete the deposit flow. CI cancelled the functional E2E job at its 15-minute
timeout.

## Root cause

`MatchInteractionController.buildingCommand` checked whether the building was
damaged before checking whether selected workers were carrying cargo. The new
repair branch therefore captured the existing deposit interaction whenever the
target Base was damaged.

## What we missed

The controller unit test for damaged buildings used the default carrying worker
fixture, which encoded the wrong precedence and asserted REPAIR. It did not cover
depositing at a damaged Base, and the focused E2E flow was not rerun after the
regression scenario gained initial damage.

## Fix

`buildingCommand` now gives DEPOSIT precedence for carrying workers. REPAIR is
selected only when no selected worker is carrying cargo. The damaged-building
unit fixture now uses a non-carrying worker, and a regression test covers the
deposit case.

## Regression

`tests/unit/web/match-interaction-controller.test.ts` asserts that a carrying
worker deposits at a damaged owned completed Base, while a non-carrying worker
repairs it. The existing economy E2E flow verifies the real browser path.

## Prevention

The controller contract now has explicit tests for both mutually exclusive
interactions, and the browser economy scenario remains part of the functional
E2E gate.

## Verification

Focused controller tests and the economy E2E file are run after the fix. The
full `verify` and CI functional E2E gates remain required before closure.
