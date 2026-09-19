# Implementation Plan: Level Editor

Spec: `docs/specs/SPEC-level-editor.md`. Capability map approved.

## Overview

Restore editor↔game parity for maps, then make the Level Editor practical to
author with: visible grid and cell highlight, explicit decoration/resource
placement, local persistence, and a playtest path into the game. Terrain
remains presentation-only; nothing here touches the deterministic simulation.

## Architecture Decisions

1. **Single map source of truth.** `MapDefinition` (`@rts/game-data`) is the
   contract. The editor, renderer, and game all render through
   `MapDefinition → mapDefinitionToGrid → TerrainScene`. No editor-only
   rendering path.
2. **Move `DressingKind` to `game-data`.** Content kinds belong with content
   (ADR-004). `terrain-dressing.ts` keeps asset keys and scatter; it imports the
   kind union from `game-data` and re-exports it so `@rts/renderer`'s public API
   does not change.
3. **Explicit placement wins over scatter.** `decorations[]` is authoritative
   when present; `decorationCounts` + `decorationSeed` remain the deterministic
   scatter fallback. Both optional, so the competitive map is unaffected.
4. **Lossless conversion.** Remove the `elevated → land` flattening and the
   stair drop in `mapDefinitionToGrid`. Re-enable elevated/stairs/decorations in
   `TerrainLayer.build`.
5. **Validate before re-enabling render.** A visual spike confirms autotile
   cliffs and stair ramps render correctly before parity is declared done, so
   the bugs behind `b7ceaf5`/`1db80aa` are not reintroduced.
6. **Hit detection by geometry, not 1024 sprites.** Replace per-cell hit
   `Graphics` with a single pointer handler that converts viewport coordinates
   to a cell. Grid and highlight are two `Graphics` overlays.
7. **Persistence is local and explicit.** Debounced `localStorage` autosave plus
   `.json` download/upload; clipboard export/import stays. Import validates the
   schema and reports specific errors.
8. **Playtest is a client bridge.** The editor writes the current
   `MapDefinition` to `localStorage`; the game reads `?map=local` in
   `useMatchSession` and passes it to `PixiRenderer` instead of
   `createCompetitiveMap()`. No server or simulation change.

## Dependency Graph

```text
map-contract (game-data types + renderer re-export)
        ↓
terrain-parity (lossless conversion + game render re-enable + parity tests)
        ├──────────────→ editor-canvas (grid, highlight, hit detection, status)
        │                        ↓
        │                editor-decorations (palette, place/remove, round-trip)
        └──────────────→ editor-playtest (localStorage + ?map=local)

map-contract ──────────→ editor-persistence (autosave, file I/O, validation)
```

## Milestones and Tasks

Task ids match `docs/ai/TASK_INDEX.md`. Each task fits one focused session and
touches at most ~5 files.

### M1 — Map contract and parity (`map-contract`, `terrain-parity`)

- [x] `EDITOR-001` Map contract: move `DressingKind` to `game-data`, add
  `DecorationPlacement`, `decorations`, `decorationCounts` to `MapDefinition`,
  re-export `DressingKind` from renderer.
  - Acceptance: public API unchanged; existing tests green; no reverse import.
  - Verify: `pnpm run typecheck`, `pnpm run lint`, `pnpm run test:unit`,
    `pnpm run test:architecture`.
  - Files: `packages/game-data/src/maps/types.ts`,
    `packages/game-data/src/maps/index.ts`, `packages/renderer/src/terrain-dressing.ts`,
    `packages/renderer/src/index.ts`.
- [x] `EDITOR-002` Lossless conversion: preserve elevated and stairs in
  `mapDefinitionToGrid`; extend round-trip to decorations.
  - Acceptance: `grid → map → grid` preserves terrain, stairs, palette, seed.
  - Verify: `pnpm run test:unit -- terrain-conversion`.
  - Files: `packages/renderer/src/terrain-conversion.ts`,
    `tests/unit/terrain-conversion.test.ts`.
- [x] `EDITOR-003` Game render parity: re-enable elevated/stairs/decorations in
  `TerrainLayer.build`; add the visual spike and `terrain-parity.test.ts`.
  - Acceptance: editor and game render identical input; spike confirms cliffs
    and ramps; competitive map still renders cleanly.
  - Verify: `pnpm run test:unit -- terrain-parity`, focused sprites-lab e2e.
  - Files: `packages/renderer/src/terrain-layer.ts`,
    `tests/unit/terrain-parity.test.ts`.
  - Result: `mapToTerrainSceneInput` used by `TerrainLayer.build`; parity pinned
    by `tests/unit/terrain-parity.test.ts` (added after the initial pass).

### M2 — Editor canvas (`editor-canvas`)

- [x] `EDITOR-010` Grid overlay and cell/brush highlight with a single pointer
  handler; remove per-paint `drawHits()` rebuild.
  - Acceptance: grid toggles; highlight follows the cursor; painting a cell does
    not recreate hit areas.
  - Verify: focused `sprites-lab` e2e + manual check.
  - Files: `apps/web/src/sprites/tabs/terrain-controller.ts`,
    `apps/web/src/sprites/tabs/TerrainView.tsx`.
  - Result: single `hitPlane` + `gridGraphics`/`highlightGraphics` overlays;
    pure `cellFromLocal` helper; `showGrid` toggle in the status bar.
- [x] `EDITOR-011` Status bar with fixed cursor coordinates and border-paint
  feedback.
  - Acceptance: coordinates always visible; blocked border paint reports why.
  - Verify: focused `sprites-lab` e2e.
  - Files: `apps/web/src/sprites/tabs/TerrainView.tsx`,
    `apps/web/src/sprites/tabs/terrain-controller.ts`.
  - Result: `onCursor` callback + fixed `Cell:` readout; border paint reports
    "locked water border — cannot paint".

### M3 — Decoration placement (`editor-decorations`)

- [x] `EDITOR-020` Decoration palette (kind + variant) with place/remove tools
  in the editor state and controller.
  - Acceptance: placing/removing updates the grid preview deterministically.
  - Verify: `pnpm run test:unit -- terrain-dressing` + focused e2e.
  - Files: `apps/web/src/sprites/tabs/terrain-controller.ts`,
    `apps/web/src/sprites/tabs/TerrainView.tsx`.
  - Result: palette enables all `DressingKind`s; paint mode `decor` places the
    selected kind/variant (toggle to remove).
- [x] `EDITOR-021` `TerrainScene` accepts explicit decoration items in addition
  to scatter, shared by editor and game.
  - Acceptance: same explicit items render identically in both.
  - Verify: `pnpm run test:unit -- terrain-parity`.
  - Files: `packages/renderer/src/terrain-scene.ts`,
    `packages/renderer/src/terrain-dressing.ts`.
  - Result: `ManualDecoration` + `drawManualDecorations` for every kind;
    explicit items take precedence over scatter.
- [x] `EDITOR-022` Decoration round-trip through `LevelData` and
  `MapDefinition`; eraser removes decorations.
  - Acceptance: export → import preserves placed decorations.
  - Verify: `pnpm run test:unit -- terrain-conversion`, focused e2e.
  - Files: `apps/web/src/sprites/tabs/terrain-controller.ts`,
    `packages/renderer/src/terrain-conversion.ts`.
  - Result: `gridToMapDefinition` carries `decorationCounts`; controller
    export/import carries `decorations`; e2e proves game export contains the
    placed kind.

### M4 — Playtest (`editor-playtest`)

- [x] `EDITOR-030` Playtest bridge: editor writes `localStorage['rts.playtestMap']`
  and opens `/?map=local`; `useMatchSession` loads and validates it.
  - Acceptance: authored map renders in the match; invalid/missing data falls
    back to the competitive map.
  - Verify: focused playtest e2e.
  - Files: `apps/web/src/sprites/tabs/TerrainView.tsx`,
    `apps/web/src/screens/useMatchSession.ts`.
  - Result: `playtest-map.ts` bridge + `validateMapDefinition` in `game-data`;
    world size derived from the map; `__rtsDebug.getMapInfo()` exposes the
    loaded map for E2E.
- [x] `EDITOR-031` Playtest e2e: editor → paint → playtest → assert the match
  renders the authored map.
  - Acceptance: test fails without the bridge and passes with it.
  - Verify: `pnpm run test:e2e:focused tests/e2e/sprites-lab.spec.ts`.
  - Files: `tests/e2e/sprites-lab.spec.ts`.

### M5 — Persistence (`editor-persistence`)

- [x] `EDITOR-040` Debounced local autosave with restore-on-mount and a clear
  action.
  - Acceptance: reload restores the working map.
  - Verify: focused e2e.
  - Files: `apps/web/src/sprites/tabs/TerrainView.tsx`,
    `apps/web/src/sprites/tabs/terrain-controller.ts`.
  - Result: `terrain-persistence.ts` + controller `onChange`; 400ms debounce,
    restore on mount, "Clear saved" action.
- [x] `EDITOR-041` `.json` download/upload plus schema validation with specific
  error messages and copy feedback.
  - Acceptance: invalid files produce actionable errors; valid files load.
  - Verify: `pnpm run test:unit` + focused e2e.
  - Files: `apps/web/src/sprites/tabs/TerrainView.tsx`,
    `apps/web/src/sprites/tabs/terrain-controller.ts`.
  - Result: `parseMapJson` surfaces `validateMapDefinition` errors; Download /
    Upload buttons; paste-import also validates.

## Verification Checkpoints

- After M1: `pnpm run verify` + focused `sprites-lab` e2e (parity is the
  foundational contract).
- After M3: `pnpm run verify` + focused e2e.
- Completion: `pnpm run verify` and `pnpm run test:e2e -- --project=chromium`.

## Risks and Mitigation

- **Re-enabling render reintroduces visual bugs.** Mitigation: `EDITOR-003`
  includes an explicit visual spike before parity is accepted; if cliffs/ramps
  are broken, the fix is scoped inside `terrain-scene.ts` before proceeding.
- **`MapDefinition` is shared.** Mitigation: all additions optional; run
  `public-api` and `package-dependencies` barriers in `EDITOR-001`.
- **Controller monolith.** Mitigation: split `terrain-controller.ts` into
  paint/overlay/persistence helpers during M2 and M3 rather than growing it.
- **Playtest map size mismatch.** `useMatchSession` currently assumes 32×32.
  Mitigation: playtest validates dimensions and derives world size from the
  map; map resizing stays out of scope.

## Backlog (out of scope)

Undo/redo, drag-paint, brush size, flood fill, keyboard shortcuts, map
resizing, unit/building placement, decoration collision, accessibility
hardening, Reset confirmation.
