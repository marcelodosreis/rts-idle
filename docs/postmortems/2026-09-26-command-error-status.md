---
status: open
classe: convention
barreira: null
regressao:
  - tests/unit/web/match-session-handlers.test.ts
---

# Command Error Changed Connection Status

## Summary

Rejected gameplay commands changed the match connection badge to `error` even though the WebSocket remained connected.

## Symptom

An invalid server command was correctly logged, but the status badge incorrectly changed from `connected` to `error`.

## Root cause

The connection handler used one `onError` callback for both server error messages and transport failures. The match handler set the connection status to `error` for every error message.

## What we missed

The handler test expected command errors to set the status to `error` instead of asserting the transport/status boundary.

## Fix

Command errors now only append an error log. Transport failures and connection close events use separate callbacks and are the only paths that change the connection status.

## Regression

`tests/unit/web/match-session-handlers.test.ts` verifies that command errors preserve `connected` and transport failures change the status.

## Prevention

The connection contract now distinguishes protocol error messages from transport lifecycle failures.

## Verification

Focused handler tests, typecheck, lint, the full verification gate, and Chromium economy/production E2E validation passed.
