---
status: open
classe: presentation
barreira: null
regressao:
  - tests/e2e/match/session-entry.spec.ts
  - tests/e2e/laboratory/renderer-lifecycle.spec.ts
  - tests/e2e/match/input-controls.spec.ts
---

# Match Refresh Bypassed the Start Screen

## Summary

The match route could be opened directly or refreshed without an explicit
navigation from the start screen. This made the browser entry lifecycle
implicit and allowed route behavior to diverge from the intended Continue/New
match flow.

## Symptom

Refreshing `/match` or navigating directly to `/match` could open gameplay
without first returning to the start screen.

## Root cause

`MatchPage` treated the presence of a stored session as sufficient permission to
enter gameplay. The stored session identifies a server runtime, but it does not
identify whether the current route transition came from the Home screen.

## What we missed

Session-entry coverage verified stored-session continuation and replacement, but
did not require a one-shot route-entry contract for direct navigation or refresh.
Two other browser tests also retained the old assumption that a refresh remained
inside the match, which the remote functional gate exposed.

## Fix

`apps/web/src/shared/transport/match-entry-state.ts` defines a typed one-shot
Home entry state. `HomePage` creates it, `MatchPage` consumes it, and direct or
refreshed `/match` routes redirect to `/` without opening gameplay transport.
Internal match transitions use the same navigation contract. Renderer and input
profile reload tests now return through Home and Continue before asserting the
match is mounted again.

## Regression

`tests/e2e/match/session-entry.spec.ts` verifies direct `/match` navigation,
refresh redirection, Home Continue, and reconnection to the original stored
session. `tests/e2e/laboratory/renderer-lifecycle.spec.ts` and
`tests/e2e/match/input-controls.spec.ts` verify reload consumers return through
Home. `tests/unit/web/match-entry-state.test.ts` verifies the boundary guard.

## Prevention

The route contract and manual smoke flow document the one-shot entry state. The
task packet explicitly forbids removing the marker without replacing its E2E
coverage and equivalent route-entry protection. Browser tests that reload a
match must assert the Home/Continue flow rather than assuming implicit resume.

## Verification

The focused web typecheck, focused unit tests, and 14-case Chromium/Firefox
session-entry E2E suite pass. The related route, HUD, and transport E2E suite
passed 33 tests with 1 intentional skip. `corepack pnpm run verify` passed.
