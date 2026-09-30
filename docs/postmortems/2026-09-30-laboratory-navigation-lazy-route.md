---
status: open
classe: presentation
barreira: QH.13
regressao:
  - tests/e2e/web-routes.spec.ts
---

# Laboratory Navigation Lazy Route

## Summary

The main branch CI functional browser job failed while navigating from the
match DevTools popover to `/laboratory`. The route URL changed, but the
laboratory page title never rendered, which blocked the dependent Release job.

## Symptom

Chromium timed out after 60 seconds waiting for
`[data-testid="laboratory-page-title"]` to contain `Asset Browser`.

## Root cause

The Asset Browser route was loaded through a React lazy boundary during a
popover-to-route navigation. In the CI browser run, the lazy route module did
not resolve after navigation and the application remained behind the route
loading fallback.

## What we missed

The direct route coverage passed, but the match-to-laboratory navigation path
was not resilient to CI chunk-loading timing. The Release job was correctly
gated on the functional E2E job, but this critical route transition was not
protected from the lazy-loading race.

## Fix

`apps/web/src/routes/router.tsx` now imports `AssetBrowserPage` eagerly while
keeping secondary Laboratory pages lazy-loaded.

## Regression

`tests/e2e/web-routes.spec.ts` exercises the match DevTools-to-Laboratory flow
and asserts the `Asset Browser` page title after navigation.

## Prevention

Critical navigation paths exposed by the match HUD must render without an
unresolved lazy boundary. The functional E2E gate remains a prerequisite for
Release, and route tests cover both direct and in-app navigation.

## Verification

- `E2E_WORKERS=1 corepack pnpm run test:e2e:focused tests/e2e/web-routes.spec.ts` — 18 passed.
- `corepack pnpm run typecheck` — passed.
- `corepack pnpm run lint` — passed.
