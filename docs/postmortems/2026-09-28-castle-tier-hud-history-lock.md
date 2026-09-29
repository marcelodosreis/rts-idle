---
status: open
classe: presentation
barreira: null
regressao:
  - tests/unit/web/match-session-handlers.test.ts
---

# Castle Tier HUD History Lock

## Summary

The match HUD used a player's highest historical Castle tier to expose Tier II
actions. After the last completed Castle II was destroyed, the HUD could still
present Lancer, Monk, and Research as available even though the authoritative
simulation correctly denied new Tier II actions.

## Symptom

The client remained visually unlocked after the player lost every completed
Castle II, creating a mismatch between visible controls and command results.

## Root cause

`resourcesForHuman` projected `highestCastleTierReached`, which intentionally
persists progression history, instead of deriving access from currently owned
completed Castle buildings in the authoritative snapshot.

## What we missed

The initial HUD contract tested historical tier serialization but had no
regression covering destruction of the last current Tier II Castle. The P2.11
acceptance flow required current ownership to control new Tier II access.

## Fix

`apps/web/src/features/match/lifecycle/match-session-handlers.ts` now derives
the HUD tier from completed owned Castle buildings in each snapshot. Historical
progress remains available in the player projection but no longer controls the
visible access lock.

## Regression

`tests/unit/web/match-session-handlers.test.ts` verifies both current Castle II
projection and relocking when only `highestCastleTierReached` remains after the
last completed Castle II disappears.

## Prevention

The current-tier regression is co-located with snapshot-to-HUD projection and
must remain part of the focused web test suite and the full verification gate.

## Verification

`pnpm exec vitest run tests/unit/web/match-session-handlers.test.ts tests/unit/web/selection-panel.test.ts tests/unit/web/match-session-runtime.test.ts`
passed with 18 tests. `pnpm --filter @rts/web typecheck` also passed.
