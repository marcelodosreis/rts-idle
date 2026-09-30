---
status: open
classe: presentation
barreira: QH.25
regressao:
  - tests/e2e/economy/production-playable.spec.ts
  - tests/e2e/economy/economy-playable.spec.ts
---

# HUD Command Regressions

## Summary

The HUD redesign initially broke command feedback and production cancellation
behavior in browser flows. The failures were visible as missing economy status
color, zero-refund cancellation of the active production item, and clicks that
landed outside the rendered canvas or on an overlapping Castle footprint.

## Symptom

Economy status text rendered without its canonical mining color. Canceling the
current queue item could select an active or completed-waiting item and return
no minerals. Research, construction, and rally E2E flows also reported missing
selections or commands when their target coordinates were outside the current
camera viewport or inside the Castle hitbox.

## Root cause

The HUD passed palette hex values as Tailwind class names, so the browser
ignored the color. The command-card cancellation action used queue index zero
without applying the existing rule that active and completed-waiting unit
items are not cancellable. Several migrated E2E helpers retained coordinates
from the previous layout without focusing the camera or accounting for the
Castle's larger visual hitbox.

## What we missed

The new command-card contract was tested for slot placement but not for the
full authoritative cancellation eligibility rule or for presentation values
that cross the Pixi/CSS boundary. The browser acceptance tests also asserted
the new DOM against old coordinate assumptions instead of using a shared
focus-and-click helper.

## Fix

- `UnitSelectionCard.tsx` applies the canonical economy color as inline CSS.
- `command-actions.ts` and `CommandBar.tsx` select the first cancellable queue
  item and preserve its authoritative queue index.
- Economy, production, research, and order-state E2E helpers now use the new
  HUD semantics and focus the camera before off-screen interactions.
- The fixed command layout and selection-state coverage remain in
  `tests/e2e/match/hud-layout.spec.ts`.

## Regression

`tests/e2e/economy/production-playable.spec.ts` verifies queued cancellation,
authoritative queue removal, and mineral refund. The economy suite verifies
the mining status text and canonical color, while research and match suites
verify the contextual selection flows.

## Prevention

The focused browser suite is part of the HUD acceptance gate and covers every
supported selection and command context. The command-state unit tests cover
eligibility calculations, and the lint/typecheck gates reject invalid CSS/TypeScript
shapes before browser execution.

## Verification

- `corepack pnpm vitest run tests/unit/web/command-layout.test.ts tests/unit/web/command-state.test.ts tests/unit/web/match-session-handlers.test.ts tests/unit/web/match-interaction-controller.test.ts` — 27 passed.
- `corepack pnpm run test:e2e:focused tests/e2e/match/hud-layout.spec.ts tests/e2e/match/hud-commands.spec.ts tests/e2e/match/hud-order-states.spec.ts tests/e2e/economy/building-hud.spec.ts tests/e2e/economy/production-playable.spec.ts tests/e2e/economy/research-playable.spec.ts tests/e2e/economy/economy-playable.spec.ts tests/e2e/responsive/hud-responsive.spec.ts --project=chromium --workers=1` — 28 passed.
