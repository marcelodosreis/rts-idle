---
status: open
classe: presentation
barreira: QH.17
regressao:
  - tests/e2e/laboratory/browser/asset-browser.spec.ts
---

# Asset List Scroll Jump

## Summary

Selecting an asset after scrolling the browser list could unexpectedly move the
list or page, making asset selection difficult and breaking the user's visual
context.

## Symptom

The user scrolled through the asset list and clicked an item, but the list
changed scroll position immediately after selection.

## Root cause

The selected asset button called `scrollIntoView()` from its React ref callback.
Selection updates caused the callback to run during rendering, and the
imperative scroll could reposition an ancestor scroll container or the page.

## What we missed

Browser tests verified selection and inspector updates but did not assert that
the asset list's scroll position remained stable after selecting an item near
the end of a scrolled list.

## Fix

Removed the imperative `scrollIntoView()` callback from
`apps/web/src/features/laboratory/browser/asset-key-tree.tsx`.

## Regression

`tests/e2e/laboratory/browser/asset-browser.spec.ts` now scrolls the asset list
to the end, selects the last asset, and verifies that the list remains at the
same scroll position.

## Prevention

Asset selection no longer performs unsolicited scrolling. Any future
auto-focus behavior must be explicit and covered by a scroll-position test.

## Verification

- `corepack pnpm run test:e2e:focused tests/e2e/laboratory/browser/asset-browser.spec.ts --project=chromium --workers=1 --grep "preserves the asset list"` — passed.
- `corepack pnpm --filter @rts/web typecheck` — passed.
- Biome check — passed.
