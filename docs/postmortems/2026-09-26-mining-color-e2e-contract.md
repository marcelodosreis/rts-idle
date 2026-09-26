---
status: open
classe: presentation
barreira: QH.25
regressao:
  - tests/e2e/economy/economy-playable.spec.ts
---

# Mining Color E2E Contract Drift

## Summary

The functional E2E pipeline failed because its mining-status color assertion still expected the previous purple color after mining was intentionally changed to the canonical yellow progress tone.

## Symptom

The browser displayed `rgb(250, 204, 21)` for `Mining`, while the E2E test expected `rgb(192, 132, 252)`.

## Root cause

The palette implementation and unit contract were updated, but the existing browser assertion was not updated with the visual contract change.

## What we missed

The local focused production and renderer checks did not include the economy-playable flow that asserted the previous mining color.

## Fix

The E2E assertion now expects the canonical mining yellow.

## Regression

`tests/e2e/economy/economy-playable.spec.ts` verifies the player-facing mining status color.

## Prevention

Visual palette changes must update unit palette coverage and all browser assertions that encode the affected semantic tone.

## Verification

The focused economy E2E, full verification gate, and CI functional E2E suite are required after this fix.
