---
status: open
classe: environment
barreira: null
regressao:
  - tests/e2e/web-routes.spec.ts
---

# E2E Laboratory Navigation Timeout

## Summary

The functional E2E workflow repeatedly timed out while navigating from the match page to the lazily loaded Laboratory route in Chromium on GitHub Actions, although the route and all other functional tests remained healthy.

## Symptom

`tests/e2e/web-routes.spec.ts` reached `/laboratory` after clicking `Open Laboratory`, but the `laboratory-page-title` element did not appear within 20 seconds. The failure occurred after the long serial E2E suite and reproduced on CI retry.

## Root cause

The assertion and test timeouts were too short for Vite's on-demand lazy-route compilation and browser loading under the CI runner's accumulated E2E workload. The route itself was valid and passed direct navigation tests.

## What we missed

The transition test used the same timeout as ordinary route assertions despite exercising a cold client-side lazy import after a long-running browser suite. Local runs did not reproduce the CI resource profile.

## Fix

Raised only the timeout for the match-to-Laboratory lazy navigation assertion in `tests/e2e/web-routes.spec.ts` from 20 to 60 seconds and the enclosing test timeout from 30 to 90 seconds.

## Regression

The existing `the match exposes laboratory navigation in the top bar` test preserves the real click-through path and asserts both the final URL and Laboratory page title.

## Prevention

Keep long-running, lazy-loaded transition assertions explicit about their CI loading budget while retaining shorter timeouts for ordinary route checks.

## Verification

Run the focused web-routes suite in CI mode and the complete functional E2E suite with Chromium and Firefox.
