---
status: open
classe: presentation
barreira: null
regressao: tests/e2e/responsive/viewport-layout.spec.ts
---

# Dark mode root class removed during the responsive viewport pass

## Summary

The responsive viewport pass removed `class="dark"` from the document root in
`apps/web/index.html`. The app has no theme toggle and its dark theme activates
only through the `.dark` ancestor selector, so every route rendered with the
light `:root` variables and the game appeared entirely white.

## Symptom

Opening the game (home, match, Laboratory, or not-found) showed a white/light
interface instead of the always-dark presentation the product uses.

## Root cause

`apps/web/src/styles/global.css` defines the dark palette under `.dark` and
declares `@custom-variant dark (&:is(.dark *))`. There is no
`prefers-color-scheme` fallback and no theme provider or toggle in the app.
Removing the hardcoded `class="dark"` from `<html>` therefore left no element
matching the dark selectors, and the base `:root` tokens (white background)
applied.

## What we missed

The responsive work changed the root document shell without a test asserting the
always-dark contract. The viewport validation only checked scroll/size bounds,
so a purely visual theme regression could pass every existing automated gate.

## Fix

- Restored `class="dark"` on `<html>` in `apps/web/index.html`.

## Regression

`tests/e2e/responsive/viewport-layout.spec.ts` now asserts
`await expect(page.locator('html')).toHaveClass(/\bdark\b/)` for every covered
route and viewport (home, not-found, all Laboratory routes, and the match).
Without the restored root class this assertion fails.

## Prevention

The always-dark contract is now an explicit browser-level acceptance assertion
inside the shared viewport helper, so any future document-shell change that
drops the theme class fails the responsive suite in Chromium and Firefox.

## Verification

- `pnpm run test:e2e:focused tests/e2e/responsive/viewport-layout.spec.ts --project=chromium`
- `pnpm run test:e2e:focused tests/e2e/responsive/viewport-layout.spec.ts --project=firefox`
- `pnpm run typecheck`
- `pnpm run lint`
