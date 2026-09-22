# INPUT-001: Unified World Interaction

## Objective

Centralize browser input normalization, camera gestures, target hit testing, and input-profile persistence without changing server authority or simulation behavior.

## Contract

- Renderer emits typed `WorldInteraction` values.
- Renderer owns camera and browser gesture handling.
- Web `MatchInteractionController` owns gameplay interpretation and command creation.
- Mouse and Trackpad profiles are explicit and persisted locally.
- Invalid preferences fall back to Mouse.
- Server validation remains authoritative.

## Acceptance

- Mouse middle-drag and wheel controls remain available.
- Trackpad profile supports two-finger pan and pinch zoom.
- Control-click does not select or duplicate a command.
- Canvas gestures do not zoom the page.
- Hit target precedence is deterministic and tested.
- Box selection is visible for the full drag lifecycle and is hidden on release/cancel.
- Renderer exposes one required `onInteraction` callback; legacy gameplay callbacks are absent.
- Renderer input cleanup is safe on cancellation and disposal.
- Documentation describes all supported controls and limitations.

## Validation

```bash
pnpm run typecheck
pnpm run lint
pnpm run test:unit
pnpm run verify
pnpm run test:e2e -- --project=chromium
```
