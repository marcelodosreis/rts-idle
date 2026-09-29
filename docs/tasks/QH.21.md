# QH.21 — Typed-Domain Completion (historical alias: QUAL-021)

**Status:** done
**Phase:** Quality Hardening / Fundação
**Dependencies:** QUAL-019

## Objective

Finish the typed-domain policy: no duplicated literal unions, single-source
registries for every closed string set, branded asset keys, and exhaustive
dispatch in the remaining UI handlers.

## Scope

- `packages/shared/src/{asset-manifest,outcomes,events,map,commands}.ts`
- `packages/protocol/src/messages/snapshot.ts`
- `packages/renderer/src/{types,building-visual-style,terrain-autotile,unit-sprite,unit-layer,renderer}.ts`
- `apps/server/src/sessions/session.ts`
- `apps/web/src/features/match/**` (HUD types, message log, debug, interaction handler)
- `tests/architecture/{public-api,typed-domain}.test.ts`

## Acceptance Criteria

- [x] Closed sets are `as const` registries: `ASSET_KINDS`, `MATCH_RESULTS`,
      `MATCH_PHASES`, `SPRITE_ANIMS`, `SPRITE_SHAPES`, `FRAME_ANIMS`,
      `BUILDING_VISUAL_KINDS`, `HUD_CONSTRUCTION_STATUSES`, `MESSAGE_LOG_KINDS`
- [x] Branded `AssetKey` with `isAssetKey`/`toAssetKey`; tools validate keys
- [x] Web HUD/debug types import the protocol/shared registries instead of re-declaring
- [x] Interaction dispatch is exhaustive with `assertNever`
- [x] `pnpm run test:architecture` green with the guard covering packages, apps, tools, and tests

## Validation

- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test:architecture`
- `pnpm run verify`

## Completion Report

PASS. Added the registries and branded asset key, wired them through renderer,
server, and web, converted the interaction handler to exhaustive `switch`
dispatch, and extended the AST guard to the whole repository.
