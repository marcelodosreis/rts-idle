---
status: open
classe: presentation
barreira: null
regressao:
  - tests/e2e/match/hud-commands.spec.ts
---

# Finished Match New Match Action Stayed Open

## Summary

Choosing `New match` from a finished match could leave the result overlay open
instead of returning to Home and starting a new session.

## Symptom

After the match reached `FINISHED`, clicking `New match` did not consistently
leave the result dialog. A new match was not created.

## Root cause

The result overlay reused the active-match replacement path. That path waits for
`releaseMatch()` before navigating. When the release transport fails, the
helper returns without clearing browser state or navigating, so the same result
overlay remains mounted.

## What we missed

The existing browser test stopped after asserting the result overlay. It did not
complete the player flow through `New match`, Home, and creation of the next
session, and the release failure path had no visible recovery transition.

## Fix

Finished-match `New match` now clears the local finished-session record and
navigates to `/` without waiting for release. The existing Home flow then
creates the next session through its normal typed entry contract. Active-match
replacement still uses the existing release path.

## Regression

`tests/e2e/match/hud-commands.spec.ts` surrenders a real match, uses the result
overlay's `New match`, verifies Home has no `Continue match`, and starts a new
session from Home.

## Prevention

The browser client specification and manual smoke flow document that
finished matches return through Home. Finished-match navigation must not reuse a
blocking active-session release path.

## Verification

The focused HUD command suite passed all 6 Chromium/Firefox cases. The full
repository verification gate passed, including typecheck, lint, unit,
integration, simulation, contract, determinism, architecture, invariants, and
build validation.
