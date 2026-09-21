---
status: closed
classe: completion-gate
barreira: null
regressao:
  - tests/e2e/economy-playable.spec.ts
---

## Summary

Chromium economy E2E timed out while waiting for Mineral `10`, despite the economy scenario correctly depositing into its 250-mineral starting wallet.

## Symptom

CI reported a timeout expecting Mineral `10`; the HUD instead progressed through values such as 260 and 270.

## Root cause

The test retained a pre-wallet-era absolute assertion even though the scenario starts with 250 minerals.

## What we missed

The test did not parse and compare against the scenario's initial wallet, and focused economy E2E was not run before PR completion.

## Fix

`tests/e2e/economy-playable.spec.ts` reads the initial Mineral HUD value and asserts that a deposit increases it; its Stop check also preserves the observed wallet value.

## Regression

The focused economy E2E now accepts the real baseline-relative sequence, including values such as 250 → 260 → 270.

## Prevention

Economy browser assertions use baseline-relative wallet values, and focused E2E listing/execution is part of this delivery's verification record.

## Verification

The focused list reported two economy scenarios, both passed in Chromium, and `pnpm run verify:browser` passed with the full Chromium suite.
