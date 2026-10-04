# Spec: Browser Client

Module id: `browser-client`

## Objective

Filtered replica of the state, RTS input, PixiJS + pixi-viewport renderer, HUD, minimap, audio, and screens (start/match). React UI outside the world's visual tree.

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

Playwright E2E covers start-screen entry, continuation, explicit replacement,
resume recovery, selection, control-groups, context-orders, build-input,
macro-ui, minimap, client-timeline, match-result, full-match, and first-match.

## Match Entry

- `/` renders the start screen without opening gameplay transport.
- `/match` resumes the stored browser session or redirects to `/?notice=match-required`.
- `/match?new=1` explicitly creates a new match after releasing any stored session.
- Legacy gameplay query parameters on `/` redirect to the explicit `/match?new=1`
  flow without changing their scenario, aggression, sprite, or local-map meaning.
- A successful handshake stores the versioned session record and removes the
  transient `new=1` marker so refresh cannot create an accidental replacement.

## Boundaries

- Always: interpolate between snapshots; never extrapolate gameplay; immediate input feedback.
- Ask first: add gameplay logic to the browser; change the default graphics backend.
- Never: compute damage, resources, victory, production, or death on the client.

## HUD Responsive Layout

- At 1280x800 and 1440x900 the HUD zones (top bar brand, controls, resource
  stats; footer selection panel and command palette) must not overlap.
- The document and footer must not overflow horizontally.
- The battlefield canvas stays square and fully visible.
- Controls keep their accessible names and tab order at all supported widths.
- Supported floor: 1280px wide. Below that the HUD may compact or wrap, but
  must never overlap or clip.

## Success Criteria

- A full match is playable through the real server.
- The E2E match replay reproduces the result.
- DOM accessibility on the menu/room flows.

## Open Questions

None.
