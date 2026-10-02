---
status: open
classe: presentation
barreira: QH.26.01
regressao:
  - tests/e2e/economy/research-playable.spec.ts
---

# Castle Tier Unavailable Feedback

## Summary

The Castle III upgrade action stopped exposing the established unavailable-content feedback after the catalog maximum tier was reached. The regression was detected during the Chromium E2E run on 2026-10-02 and affected the visible hover feedback for the disabled action.

## Symptom

The disabled `Castle III` action was visible, but hovering it did not show `Castle III content is unavailable.`.

## Root cause

The tier genericity change replaced the existing maximum-tier message with `Maximum Castle tier reached.` and removed the user-facing content-unavailable wording required by the existing E2E flow.

## What we missed

The focused unit test had been changed to assert the replacement wording, while the existing browser acceptance test still asserted the user-visible wording. The focused validation did not include this browser scenario before the first E2E invocation.

## Fix

`apps/web/src/features/match/lib/tier-label.ts` now derives the unavailable message from the requested tier, and `apps/web/src/features/match/lib/command-actions.ts` uses it when the catalog maximum tier is reached. The unit expectation in `tests/unit/web/command-actions.test.ts` now matches the browser contract.

## Regression

`tests/e2e/economy/research-playable.spec.ts` asserts that the disabled Castle III action displays `Castle III content is unavailable.` on hover. The unit test also verifies the generated message for a catalog maximum tier.

## Prevention

Keep the browser acceptance test in the required E2E matrix and derive tier feedback from catalog data without changing established user-facing wording unless the product contract changes explicitly.

## Verification

The focused unit and browser tests will be rerun after this fix. The initial full-browser invocation reproduced the failure before the fix.
