---
status: open
classe: test
barreira: functional-e2e
regressao: tests/e2e/match/control-click-attack.spec.ts, tests/e2e/match/hud-commands.spec.ts, tests/e2e/match/monk-heal.spec.ts
---

# Functional E2E Roster and Asset Assumptions

## Symptom

The functional E2E CI job failed after the 6v6 demo scenario became 8v8. Attack tests selected the full player roster, and the Monk Heal test required an animated sprite when CI had no optional art assets.

## Root Cause

The attack tests assumed every selected unit was attack-capable. The new roster includes a support-only Monk, so authoritative command validation correctly rejected the mixed offensive selection. The Heal test treated the fallback visual as a failure even though the repository permits CI runs without the licensed asset pack.

## What We Missed

Scenario roster changes were not reflected in the E2E selection fixture, and the new visual assertion did not use the existing optional-art helper.

## Fix

Expose unit kinds through the E2E debug boundary, select only non-Monk units for offensive tests, and gate the animation assertion on `hasArt()` while retaining the authoritative health and cooldown assertions.

## Regression

The affected E2E specs now fail if a support-only unit is included in offensive selection assumptions or if the Heal command fails to restore health and enter cooldown.

## Prevention

Update scenario-dependent E2E fixtures when rosters change and use `hasArt()` for every assertion that depends on the optional asset pack.
