---
status: open
classe: completion-gate
barreira: QH.26.01
regressao:
  - tests/e2e/web-routes.spec.ts
---

# Web route transition starvation

## Summary

On CI, the functional Chromium job failed after navigating from the match
DevTools menu to `/laboratory`. The browser URL changed to `/laboratory`, but the
Laboratory tree never rendered. The same test passed locally and on retry.

## Symptom

`tests/e2e/web-routes.spec.ts` ("the match exposes laboratory navigation in the
top bar") timed out for 60 seconds waiting for `laboratory-page-title` while the
failure screenshot still showed the match HUD with the DevTools popover open and
the URL already at `/laboratory`.

## Root cause

React Router 7 wraps navigation state updates in `React.startTransition`, so the
history entry updates before React commits the new route. The match page emits
urgent state updates on every authoritative snapshot (about 20 Hz). On a slow,
loaded CI runner each match HUD render consumes most of the frame budget, so the
navigation transition is repeatedly interrupted by urgent work and never
commits. The URL is updated optimistically while the old tree stays mounted,
which is exactly what the screenshot shows. On faster machines the transition
finishes and the flake is invisible.

The prior postmortem (`2026-10-01-main-e2e-navigation-flake.md`) attributed the
same symptom to the route loading boundary and did not address the starved
router transition, so the flake returned.

## What we missed

The regression only asserted the final title and could not distinguish "content
still loading" from "navigation never committed". No test exercised navigation
while the match was under CPU pressure, so the starved transition was only
observable on a slow runner.

## Fix

`BrowserRouter` now sets `useTransitions={false}` in
`apps/web/src/app/app.tsx`. Navigations become ordinary urgent updates and
commit even when match snapshot updates are saturating the frame budget. Routes
are eager or lightweight, so the transition optimization provided no benefit
here.

## Regression

`tests/e2e/web-routes.spec.ts` adds "laboratory navigation commits while the
match is updating under load", which throttles the Chromium CPU 20x before
clicking "Open Laboratory". Without `useTransitions={false}` the Laboratory title
never appears; with the fix it renders within the timeout.

## Prevention

The E2E suite now reproduces router-transition starvation deterministically
instead of depending on runner timing, so the QH.26.01 functional lane fails
whenever navigation can be starved again.

## Verification

- `tests/e2e/web-routes.spec.ts` under CPU throttling: fails before the fix,
  passes after it.
- `pnpm run verify`.
- `pnpm run test:e2e:fast`.
