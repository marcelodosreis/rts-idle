# AUTH-009 — Snapshot building projection

**Status:** done

## Task

- Objective: render and hit-test buildings exclusively from snapshot footprint.
- Scope: renderer projection and layer tests.
- Non-goals: changing construction simulation.

## Read first

`packages/protocol/src/messages/snapshot.ts`, `apps/web/src/client/snapshot-to-frame.ts`, `packages/renderer/src/world-object-layer.ts`, layer tests.

## Contract

Created building geometry is authoritative in `SnapshotBuilding`; HUD may derive only paused presentation state.

## Tests and validation

`pnpm run test:unit`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## Acceptance and stop conditions

- [x] Draw, bar, selection, and hit-test use received footprint.

## Completion report

PASS recorded after focused projection validation.
