---
status: closed
classe: convention
barreira: null
regressao:
  - tests/e2e/economy/economy-playable.spec.ts
  - tests/unit/renderer/unit-economy.test.ts
---

# Postmortem: economy-playable E2E asserted a sprite anim that can't exist in CI

Date: 2026-09-19

## Summary

`tests/e2e/economy/economy-playable.spec.ts` (added with PR #10) asserted the
worker's sprite animation was literally `'gather'`, then `'carry_run'`, then
`'idle'`. CI's End-to-End Tests job failed on the first of these. The same
failure reproduced on a bare local checkout — it was not CI flakiness.

## Symptom

CI (`End-to-End Tests`) failed with:

```
Expected: "gather"
Received: "fallback"
```

`renderer-perf.spec.ts` also failed in the same run with a 180s timeout on
the 5000-unit measurement.

## Root cause

Per ADR-015, the real sprite pack (`tiny_swords`) is license-gated and never
committed; it only exists locally after running `pnpm run assets:prepare`
against a downloaded vendor pack. Without it, `AssetLibrary.load()` never
finds `apps/web/public/assets/manifest.json`, so **every** unit renders as a
fallback circle (`UnitSprite.stateName()` returns `'fallback'`) — in CI,
and on any machine that hasn't run that prepare step, including this one.

`economyAnimation()` (`packages/renderer/src/unit-economy.ts`) only ever
returns the real `gather`/`carryRun`/`carryIdle` sprite when those frames
loaded, which requires the missing art. The new test asserted the literal
animation name, which can never be true in this environment — the assertion
was wrong on any machine without the art pack, not just CI.

`renderer-perf.spec.ts`'s 5000-unit case failed separately: CI's headless
SwiftShader (software rendering) is slow enough that measuring 120 frames at
that unit count exceeded the test's 180s budget.

## What we missed

ADR-015 already documents the rule ("tests are fallback-tolerant so CI stays
green without art"), and `tests/e2e/laboratory/sprite-fallback.spec.ts` exists
specifically to assert `anim === 'fallback'` is a normal, expected state. The
new test didn't follow that established convention, and nothing enforced it
— there was no lint, CI check, or shared test helper that would have caught
a literal-animation assertion at review time.

Separately, no test covered `economyAnimation`/`economyFrameKey` (the pure
phase-to-animation mapping) directly. Making the E2E assertion
fallback-tolerant closes the false failure, but on its own it leaves that
mapping logic unverified in CI, since the real branch is never exercised
there either.

## Fix

- `tests/e2e/economy/economy-playable.spec.ts`: the three anim assertions now accept
  the real animation name **or** `'fallback'` (matching the convention in
  `sprite-fallback.spec.ts`), with a comment explaining why.
- `tests/e2e/laboratory/renderer-perf.spec.ts` + `apps/web/src/perf/main.ts`: sample
  fewer frames at the 5000-unit count and raise the test timeout to
  `300_000`, so the measurement fits without cutting the smoke-test signal.

## Regression

`tests/unit/renderer/unit-economy.test.ts` (new) calls `economyAnimation` and
`economyFrameKey` directly with each `EconomyPhase` and every faction —
no browser, no art pack required. It fails if the phase-to-animation mapping
regresses, independent of whether art is loaded, closing the gap the E2E
fallback-tolerance fix left open. `packages/renderer/src/index.ts` now
exports `unit-economy.js` so the pure functions are reachable from
root-level `tests/unit`.

## Prevention

- The fallback-tolerant assertion pattern is now commented inline in
  `economy-playable.spec.ts`, next to the assertions themselves, not just in
  ADR-015 — the next person writing a sprite-state assertion sees the rule
  where they're about to break it.
- Any future animation-selection logic should get a direct unit test (like
  `unit-economy.test.ts`) rather than relying on E2E, since E2E cannot
  exercise the non-fallback branch in this repo without the licensed art.
- Not done: no automated lint/CI rule blocks a literal (non-fallback-
  tolerant) sprite-anim assertion from being merged again — this postmortem
  and the inline comment are the only guardrails today.

## Verification

- `pnpm run typecheck`, `pnpm run lint`: pass.
- `pnpm run test:unit`: 201 passed (26 files), including the new
  `unit-economy.test.ts`.
- `pnpm exec playwright test tests/e2e/economy/economy-playable.spec.ts
  tests/e2e/laboratory/renderer-perf.spec.ts tests/e2e/laboratory/sprite-fallback.spec.ts
  --project=chromium`: 5 passed.
- Full `pnpm exec playwright test --project=chromium`: 26 passed, 17 skipped
  (other browser projects).
