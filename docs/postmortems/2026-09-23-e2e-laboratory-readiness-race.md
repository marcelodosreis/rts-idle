---
status: open
classe: presentation
barreira: null
regressao:
  - tests/e2e/sprites-lab.spec.ts
  - tests/e2e/art.ts
---

# E2E Laboratory Readiness Race

## Summary

The CI E2E job failed repeatedly in the Laboratory and economy animation tests because browser assertions began as soon as debug bridges or the asset manifest existed, before the asset catalog and renderer sprites were ready.

## Symptom

CI reported missing Laboratory options such as `rubber_duck` and `rock1`, missing the `Show grid` switch, and animation assertions receiving `fallback` instead of `gather` or `carry_idle`.

## Root cause

`openLab()` waited only for `window.__spriteLab`, which is registered before `useAssetLibrary()` finishes loading the manifest. Separately, `hasArt()` treated an HTTP 200 manifest response as proof that the renderer had loaded usable textures, although the active renderer could still be in fallback mode. A valid but empty manifest also made the helper wait forever for a catalog readiness signal that could never be emitted.

## What we missed

The E2E readiness contract covered route and debug-bridge availability but not feature data readiness. The CI-only asset timing exposed that a manifest response and a mounted React route are not equivalent to a populated catalog or ready renderer sprite.

## Fix

- `tests/e2e/sprites-lab.spec.ts` now waits for the Assets list and its first option after confirming art availability.
- `tests/e2e/art.ts` now requires a non-empty manifest and checks the active renderer sprite state, returning false when usable art is unavailable.
- `package.json` increases the full E2E run from one to two Playwright workers.

## Regression

The Laboratory E2E setup now asserts that the populated Assets list is ready before search, grouping, and slice tests run. Match E2E helpers no longer enable art-only assertions while the renderer reports fallback sprites.

## Prevention

Browser helpers must wait for the state they exercise, not only route mounting or network availability. The full E2E gate runs both Chromium and Firefox with two workers so readiness races are exercised under realistic scheduling.

## Verification

- `pnpm run test:e2e:focused tests/e2e/sprites-lab.spec.ts --grep "asset list|unique assets|multi-frame|nested sub-headers"`
- `pnpm run test:e2e:focused tests/e2e/economy-playable.spec.ts`
- `pnpm run test:e2e:all`
