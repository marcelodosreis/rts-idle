---
status: open
classe: coverage
barreira: null
regressao:
  - tests/e2e/match/hud-commands.spec.ts
---

# HUD Commands Auto-Battle Race

## Summary

The STOP/ATTACK HUD command E2E raced the 8v8 auto-battle. By the time the test
issued and polled commands, the player squad had already been wiped, so the
armed attack could not produce damage and the assertion timed out.

## Symptom

`expect.poll(() => anyRedHealthBelowBaseline).toBe(true)` timed out in Chromium.
The failure snapshot showed `Selected 0`, nine surviving units, and a match
clock at 22 seconds, with the command grid present but no selection.

## Root cause

The test used `?scenario=8v8&aggression=offensive`, which keeps both squads
fighting automatically. The test selected blue units, stopped them, and then
re-armed ATTACK, but the outcome of the parallel auto-battle depends on wall
clock time, not only the seed: under a slow run the selected blues died before
or during the final poll, leaving nothing to re-engage with.

## What we missed

The test depended on the survival of auto-battling units instead of controlling
the encounter. The selection was also never refreshed after deaths, so a stale
selection could silently issue no attack.

## Fix

`tests/e2e/match/hud-commands.spec.ts` now runs `aggression=passive`, issues the
initial ATTACK order itself, verifies damage, stops it, then re-arms ATTACK
against the healthiest living red. It re-selects living non-monk blues before
the second engagement and picks the target from current positions at click time.

## Regression

The rewritten E2E asserts the full contract deterministically: armed ATTACK
deals damage, STOP cancels the order, and a new armed ATTACK re-engages, in
Chromium and Firefox.

## Prevention

Command-HUD E2E must control the encounter instead of racing unmotivated combat;
selections must be refreshed from live units before every order.

## Verification

- `pnpm run test:e2e:focused tests/e2e/match/hud-commands.spec.ts` — 6 passed
  across Chromium and Firefox.
