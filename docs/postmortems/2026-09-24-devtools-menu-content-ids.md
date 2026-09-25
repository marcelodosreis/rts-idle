---
status: closed
classe: convention
barreira: QUAL-020
regressao:
  - tests/e2e/web-routes.spec.ts
---

# 2026-09-24 — DevTools menu content ids renamed during decomposition

## Symptom

`tests/e2e/web-routes.spec.ts` ("match popovers stay open until their own trigger
is clicked again") failed in both Chromium and Firefox after the web
decomposition: expanding "Server Log" toggled `aria-expanded` but
`#game-devtools-log-content` was never found.

## Root cause

Extracting the collapsible menu sections replaced the hard-coded content ids
(`game-devtools-log-content`, `laboratory-session-content`,
`laboratory-options-content`) with a derived `` `${headingId}-content` ``.
The component still worked visually, but the DOM contract asserted by the E2E
suite changed, which is a behavior regression for existing consumers.

## What we missed

The decomposition treated the section markup as an implementation detail and
did not inventory the DOM ids/contracts that tests and other code depend on.
The typed checks (typecheck, Biome) cannot see DOM id contracts.

## Fix

`CollapsibleSection` now takes an explicit `contentId`; each section passes its
original id, restoring the exact DOM contract while keeping the extracted
component.

## Regression

The existing `tests/e2e/web-routes.spec.ts` case (popover open/close by id)
fails without the fix and passes with it; it was run in both browsers.

## Prevention

QUAL-020 requires focused E2E for decomposed UI, and the completion gate runs
the full `test:e2e:all`; DOM-id contracts are covered by tests rather than
review alone.
