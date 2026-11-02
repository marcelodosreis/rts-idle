---
status: open
classe: completion-gate
barreira: null
regressao:
  - tests/e2e/economy/economy-playable.spec.ts
---

# Economy E2E Budget Under Radius Four

## Summary

The economy browser flow completed its gather, deposit, and STOP behavior but
the test budget expired while it waited for the final authoritative ticks after
the radius-four observation change.

## Symptom

`a player gathers, deposits, repeats, and stops through browser controls`
timed out at `waitForTicks(page, 15)` with the worker stopped and the wallet
already unchanged.

## Root cause

The test had a fixed 35-second budget. Under the real server and Firefox or
Chromium load, the radius-four observation stream and the complete natural
economy interaction left insufficient time for the final 15-tick stability
assertion.

## What we missed

The flow's functional waits have explicit budgets, but the enclosing test
budget was lower than the worst-case sum of those waits plus browser startup and
observation rendering.

## Fix

The enclosing economy flow budget is now 60 seconds. The authoritative tick
wait, position assertion, and wallet assertion remain unchanged.

## Regression

`tests/e2e/economy/economy-playable.spec.ts` continues to require the full
natural gather, deposit, repeat, and STOP flow through the real server.

## Prevention

Player-facing E2E budgets must cover the sum of their observable state waits on
the required browsers without replacing those waits with wall-clock sleeps.

## Verification

- Focused economy flow in Chromium and Firefox after the budget adjustment.
