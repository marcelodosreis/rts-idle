# Spec: Browser Client

Module id: `browser-client`

## Objective

Filtered replica of the state, RTS input, PixiJS + pixi-viewport renderer, HUD, minimap, audio, and screens (menu/room). React UI outside the world's visual tree.

## Commands

```bash
pnpm run dev
pnpm run test:e2e:focused tests/e2e/<target>.spec.ts --list
pnpm run test:e2e:focused tests/e2e/<target>.spec.ts
pnpm run build
```

## Project Structure

```text
apps/web/src/
├── app/
├── screens/
├── room/
├── hud/
├── client/
├── input/
└── (renderer via packages/renderer)
```

## Code Style

The renderer only observes; gameplay rules never run live in the browser. The ticker's `deltaTime` drives animations, not rules.

## Testing Strategy

Playwright E2E (room-entry, selection, control-groups, context-orders, build-input, macro-ui, minimap, client-timeline, match-result, full-match, first-match). See master plan (phase 8).

## Boundaries

- Always: interpolate between snapshots; never extrapolate gameplay; immediate input feedback.
- Ask first: add gameplay logic to the browser; change the default graphics backend.
- Never: compute damage, resources, victory, production, or death on the client.

## Success Criteria

- A full match is playable through the real server.
- The E2E match replay reproduces the result.
- DOM accessibility on the menu/room flows.

## Open Questions

None.
