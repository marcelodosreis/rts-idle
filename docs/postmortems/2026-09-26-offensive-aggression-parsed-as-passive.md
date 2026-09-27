---
status: open
classe: presentation
barreira: QH.25
regressao: [tests/unit/web/match-query.test.ts, tests/e2e/economy/scenarios.spec.ts]
---

# Offensive Aggression Parsed as Passive

## Summary

After making passive aggression the default, selecting `offensive` through the
URL still sent `passive` to the server, so Economy enemies never attacked.

## Symptom

Opening the default scenario with `?aggression=offensive` left the four enemy
pawns stationary and player pawns took no damage.

## Root cause

The query parser returned `passive` for the only recognized value and used the
new passive default for every other value. `offensive` was therefore silently
normalized to `passive`.

## What we missed

The query unit test covered the passive default and an invalid value, but did
not assert that the explicit offensive value survived parsing.

## Fix

`parseAggression` now accepts both `offensive` and `passive`, falling back to
passive only for invalid or missing values.

## Regression

The query unit test asserts explicit offensive parsing, and the Economy browser
test verifies that offensive default enemies eventually damage a player pawn.

## Prevention

Both the URL parser contract and the real WebSocket/server flow now cover the
two supported aggression modes.

## Verification

Focused unit test, fresh-server Chromium E2E, `pnpm run verify`, and the
production build must pass before closure.
