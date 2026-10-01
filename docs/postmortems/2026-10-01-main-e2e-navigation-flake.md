---
status: closed
classe: completion-gate
barreira: QH.26.01
regressao:
  - tests/e2e/web-routes.spec.ts
---

# Main E2E Navigation Flake

## Summary

The post-merge `main` pipeline failed even though the pull-request pipeline had
passed on the same tree. The functional browser job timed out while navigating
from the match DevTools menu to `/laboratory`, blocking the release job.

## Symptom

The URL changed to `/laboratory`, but
`[data-testid="laboratory-page-title"]` did not render within the test budget.
The retry failed in the same run. The workflow had no Playwright trace,
screenshot, or browser error artifact to distinguish loading from a render
failure.

## Root cause

The route navigation path was timing-sensitive and the route-level Suspense
boundary could replace the complete Laboratory page, including its header, with
the generic loading fallback. CI also treated a retry as sufficient evidence of
success and did not preserve failure diagnostics. The PR and post-merge runs
were independent executions, so the same tree could pass one and fail the
other.

## What we missed

The existing route regression only observed the final title. It did not expose
the loading/error state, and the CI workflow did not fail on retry-only passes
or retain browser diagnostics. Earlier route hardening removed one lazy import
but did not protect the layout from child loading/render failures.

## Fix

- CI validation lanes are parallelized without removing any suite or browser.
- Playwright fails CI when a test passes only after retry and captures
  failure/retry diagnostics.
- Laboratory content now has an inner loading boundary and an error boundary,
  so the header/navigation remain visible while content loads or fails.
- The route regression asserts that the loading and error states are absent
  after successful navigation.

## Regression

`tests/e2e/web-routes.spec.ts` covers the real match-menu navigation in
Chromium and Firefox and asserts the Laboratory title, no route-content error,
and no route-level loading fallback.

## Prevention

QH.26.01 makes all existing code and browser suites required parallel lanes,
marks retry-only passes as failures, and publishes diagnostics only when an E2E
lane fails. This prevents green CI from hiding a flaky test and makes the next
failure actionable.

## Verification

Local QH.26.01 validation:

- `pnpm run verify` — PASS.
- Functional Chromium `115/115` and functional Firefox `115/115`.
- Performance Chromium `1/1` and performance Firefox `1/1`.
- Focused readiness/route regression set (10 specs, both browsers) `64/64`.

The browser lanes must run sequentially on one machine; running both lanes
concurrently starves CPU and makes the readiness predicate time out. CI runs
each browser in a separate matrix runner, so the lanes do not contend.

CI result (run `36822886466`, PR #42): all checks pass — functional Chromium
`12m38s`, functional Firefox `8m12s`, performance Chromium `2m54s`, performance
Firefox `1m21s`, plus static and all eight code-test suites. No retry-only pass
was reported.
