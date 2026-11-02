---
status: open
classe: coverage
barreira: null
regressao:
  - tests/e2e/match/hud-commands.spec.ts
---

# HUD Commands Auto-Battle Race

## Summary

The STOP/ATTACK HUD command E2E raced combat and presentation timing. During the
small-vision validation, the reveal worker or the second attack target could
still be moving when the test issued its pointer interaction, so the armed
attack could not produce damage and the assertion timed out.

## Symptom

`expect.poll(() => anyRedHealthBelowBaseline).toBe(true)` timed out in Chromium.
The failure snapshot showed `Selected 0`, nine surviving units, and a match
clock at 22 seconds, with the command grid present but no selection.

## Root cause

The test used `?scenario=8v8&aggression=offensive`, which keeps both squads
fighting automatically. The test selected blue units, stopped them, and then
re-armed ATTACK, but the outcome of the parallel auto-battle depends on wall
clock time, not only the seed: under a slow run the selected blues died before
or during the final poll, leaving nothing to re-engage with. The radius-four
fixture also needed to wait for the revealing worker and the authoritative
target position before calculating a pointer coordinate. Hidden enemy units
could leave the renderer between health polls, so treating missing health as
zero made a stable baseline impossible.

## What we missed

The test depended on the survival of auto-battling units instead of controlling
the encounter. The selection was also never refreshed after deaths, and the
browser setup treated a camera move or a click-issued move as proof that the
target was ready for the next interaction, and treated an absent observation
as a live unit with zero health.

## Fix

`tests/e2e/match/hud-commands.spec.ts` now runs `aggression=passive`, issues the
initial ATTACK order itself, verifies damage, stops it, then re-arms ATTACK
against the healthiest living red. It re-selects living non-monk blues before
the second engagement, waits for the selected target position and camera to
settle, and picks the target from its current position at click time. Health
baselines now contain only units with a current renderer observation, rather
than converting hidden units to zero health.
`tests/e2e/support/settle.ts` moves the revealing worker to a non-unit ground
tile and waits for arrival before asserting that enemy units are observed.

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
- `CI=1 E2E_WEB_PORT=5175 E2E_SERVER_PORT=8082 E2E_WORKERS=1 pnpm run test:e2e:focused tests/e2e/match/hud-commands.spec.ts` — 6 passed.
