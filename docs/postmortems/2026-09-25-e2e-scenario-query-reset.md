---
status: open
classe: environment
barreira: null
regressao:
  - tests/e2e/economy/scenarios.spec.ts
---

# E2E Scenario Query Reset

## Summary

The isolated E2E suite silently navigated match scenarios back to `/`, so every scenario and aggression URL tested the default 6v6 offensive match.

## Symptom

Scenario, passive aggression, sprite fallback, and victory E2E assertions received default match state when Playwright used dedicated ports.

## Root cause

`tests/e2e/support/settle.ts` redirected pages whose URL did not begin with the hard-coded `http://localhost:5173`, discarding each query string on isolated test ports.

## What we missed

The helper was validated only against the default development port. The complete suite did not use dedicated ports while local development servers were active.

## Fix

The helper navigates only when the page is still `about:blank`; it otherwise waits for the already-loaded match without changing its URL.

## Regression

`tests/e2e/economy/scenarios.spec.ts` runs against configurable dedicated ports and verifies non-default scenario and aggression behavior in both browsers.

## Prevention

Playwright supports validated `E2E_WEB_PORT` and `E2E_SERVER_PORT` values, so isolated runs no longer reuse or assume local development ports.

## Verification

Run the focused scenario suite and the complete E2E suite with `CI=1`, `E2E_WEB_PORT`, and `E2E_SERVER_PORT`.
