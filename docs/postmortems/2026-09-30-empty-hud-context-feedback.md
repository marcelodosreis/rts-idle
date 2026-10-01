---
status: open
classe: presentation
barreira: null
regressao:
  - tests/e2e/match/hud-game-feel.spec.ts
---

# Empty HUD Context Feedback

## Summary

The match HUD rendered an empty bordered context-feedback overlay above the
`COMMANDS` card as soon as an idle match loaded. The overlay had no text and no
actionable content, reducing the available canvas space and making the HUD look
like it was displaying a stale warning.

## Symptom

At match start, with no command armed and no player interaction, the DOM
contained `[data-testid="hud-context-feedback"]` with an empty text node. Its
`data-feedback-source` was `system`, although no system feedback was present.

## Root cause

`HudContextFeedback` combined nullable inputs with
`instruction ?? feedback?.message`. When both inputs were `null`, optional
chaining produced `undefined`, but the component only returned early for
`message === null`. React therefore mounted the styled container without
content.

## What we missed

The HUD E2E coverage asserted informative text for armed modes and cleared mode
feedback after `Escape`, but it did not assert the negative idle state. The
optional-chain result also widened the runtime value beyond the explicit
`string | null` prop contract without a matching empty-content guard.

## Fix

`apps/web/src/features/match/ui/HudContextFeedback.tsx` now returns `null` for
`undefined`, empty, and whitespace-only messages before creating the overlay.

## Regression

`tests/e2e/match/hud-game-feel.spec.ts` now loads an idle default match and
asserts that `hud-context-feedback` has zero instances.

## Prevention

The idle negative case is now part of the focused HUD browser acceptance suite.
Any future feedback producer must provide visible text before this overlay can
be rendered.

## Verification

- Pre-fix DOM reproduction showed one empty `hud-context-feedback` element above
  the `COMMANDS` card.
- `pnpm exec vitest run tests/unit/web/hud-notifications.test.ts` — 4 passed.
- `E2E_WEB_PORT=5175 E2E_SERVER_PORT=8082 pnpm run test:e2e:focused tests/e2e/match/hud-game-feel.spec.ts --project=chromium --project=firefox --workers=1` — 6 passed.
- `pnpm run verify` — passed: typecheck, lint, all repository test suites, and
  build.
- `E2E_WEB_PORT=5175 E2E_SERVER_PORT=8082 E2E_WORKERS=1 pnpm run test:e2e:fast` —
  230 passed.
