# QH.08 — Dynamic geometry (historical alias: QUAL-008)

**Status:** complete
**Phase:** Quality Hardening / Low Effort
**Dependencies:** QH.02 (reduced scope approved: viewport shell and dynamic HUD geometry validated through real-server E2E)

## Objective

Keep every player-facing surface inside the viewport with dynamic content, using
relative layout instead of fixed viewport math, and guarantee the always-dark
root presentation.

## Scope

- `tests/e2e/responsive/hud-responsive.spec.ts` — dynamic HUD layout.
- `tests/e2e/responsive/viewport-layout.spec.ts` — home, not-found, all
  Laboratory routes, and the match stay inside desktop and mobile viewports,
  with the document root always carrying the `dark` class.
- `apps/web` shell/layout components that adopt full-viewport, relative sizing.
- `apps/web/index.html` — always-dark root class.
- Postmortem `docs/postmortems/2026-11-01-dark-mode-root-class-removed.md`.

## Acceptance Criteria

- [x] Tests pass with dynamic content in Chromium and Firefox.
- [x] No absolute positioning in HUD assertions.
- [x] Every covered route and viewport reports no page overflow in both axes.
- [x] The document root always renders in dark mode (regression assertion).

## Validation

- `pnpm run test:e2e:focused tests/e2e/responsive/viewport-layout.spec.ts --project=chromium`
- `pnpm run test:e2e:focused tests/e2e/responsive/viewport-layout.spec.ts --project=firefox`
- `pnpm run test:e2e:focused tests/e2e/responsive/hud-responsive.spec.ts`
- `pnpm run verify`
