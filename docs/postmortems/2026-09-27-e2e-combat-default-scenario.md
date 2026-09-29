---
status: open
classe: coverage
barreira: QH.19
regressao:
  - tests/e2e/match/visual-combat.spec.ts
---

# Visual Combat E2E Used a Non-Combat Scenario

## Summary

The visual combat E2E opened the default economy scenario while asserting that
units would damage and destroy one another. The test timed out because that
scenario intentionally leaves the player units idle and does not provide the
required engagement.

## Symptom

Chromium waited for a damaged unit and eventually received only full-health
units. Firefox additionally could not launch until its host libraries were
made available.

## Root cause

The test URL did not select the authored `6v6` offensive scenario, despite its
comments describing hostile squads.

## What we missed

The test had no explicit scenario contract and did not assert the initial
scenario before waiting for combat feedback.

## Fix

`visual-combat.spec.ts` now opens `scenario=6v6&aggression=offensive` and uses a
test timeout consistent with the full combat lifecycle.

## Regression

The same test now passes in Chromium and Firefox and verifies damage followed
by unit removal.

## Prevention

Combat E2E scenarios must select their authored scenario explicitly rather than
depending on the product default.

## Verification

- `pnpm run test:e2e:focused tests/e2e/match/visual-combat.spec.ts --project=chromium --workers=1`
- `pnpm run test:e2e:focused tests/e2e/match/visual-combat.spec.ts --project=firefox --workers=1`
