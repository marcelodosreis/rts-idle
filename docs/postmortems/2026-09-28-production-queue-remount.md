---
status: open
classe: presentation
barreira: null
regressao:
  - tests/e2e/economy/research-playable.spec.ts
---

# Production Queue Remount

## Summary

The unified production queue remounted its item components on every simulation tick while an item progressed. This made cancellation unreliable in the browser and also hid the empty-queue feedback after completion.

## Symptom

The Chromium research E2E timed out while clicking `cancel-research-0`, reporting that the button was repeatedly detached. The completion scenario also could not find `production-queue-empty` after Economy research completed.

## Root cause

`ProductionPanel` used a key containing `progressTicks`, so every progress update changed the React key and replaced the button DOM node. The empty-state `QueueList` was rendered only when the queue had items.

## What we missed

The browser acceptance flow was not rerun after moving Research into the unified, continuously updating queue. Focused component tests did not exercise a cancellation click while progress snapshots were arriving.

## Fix

`ProductionPanel` now keys queue entries by their stable FIFO index and always renders `QueueList`, allowing the existing empty-state feedback to remain visible.

## Regression

`tests/e2e/economy/research-playable.spec.ts` covers cancellation of an active queued research item and completion returning the queue to its empty state.

## Prevention

The browser flow is part of the unified production queue acceptance coverage. Queue item keys must not include mutable progress fields.

## Verification

The focused Chromium E2E is rerun after this fix, alongside the repository unit, simulation, contract, architecture, lint, typecheck, and build barriers.
