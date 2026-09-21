# Spec: Level Editor

Initiative id: `level-editor`

## Objective

Turn the Sprite Lab's **Level Editor** tab (`/sprites/`, "Level Editor") into a
reliable map-authoring tool whose output is exactly what the game renders. The
editor must stop offering capabilities the game discards, gain the editing
affordances that make authoring practical, support explicit decoration/resource
placement, persist work safely, and let a designer playtest the authored map in
the game.

Users: developers and designers authoring `MapDefinition` terrain and
decoration layouts for the browser game. Success means "what you paint is what
the match renders", with no silent loss on export/import.

## Capability Map

Approved module index for this initiative. Each module runs
Spec → Plan → Tasks → Implement in dependency order.

| Module id | Responsibility | Depends on |
|---|---|---|
| `map-contract` | Move `DressingKind` to `game-data`; extend `MapDefinition` with explicit `decorations[]` and scatter `decorationCounts?` | — |
| `terrain-parity` | Lossless round-trip (elevated + stairs) and re-enable game rendering of elevated/stairs/decorations | `map-contract` |
| `editor-canvas` | Grid overlay, cell/brush highlight, single-hit detection, fixed cursor coordinates | `terrain-parity` |
| `editor-decorations` | Decoration/resource palette with place/remove tools and round-trip | `map-contract`, `editor-canvas` |
| `editor-persistence` | Local autosave, `.json` download/upload, schema validation | `map-contract` |
| `editor-playtest` | Bridge an authored map into the game via `localStorage` + `?map=local` | `terrain-parity` |

Build order: `map-contract` → `terrain-parity` → `editor-canvas` →
`editor-decorations` → `editor-playtest`; `editor-persistence` may run in
parallel after `map-contract`.

Interface boundaries:

- `map-contract` owns the public data type in `game-data`, consumed by both the
  renderer and the editor. `DressingKind` remains exported from `@rts/renderer`
  (re-export) so the public API does not regress.
- `terrain-parity` is the only module that changes the pipeline
  `MapDefinition → mapDefinitionToGrid → TerrainScene`.
- `editor-*` modules consume those contracts and never write to `simulation`.
  Terrain is presentation-only; the simulation never sees the map.

## Tech Stack

TypeScript, React 19, PixiJS + pixi-viewport, Vitest, Playwright, Biome.
Shared map data lives in `@rts/game-data`; rendering in `@rts/renderer`; the
editor UI in `apps/web/src/sprites`.

## Commands

```bash
pnpm run typecheck
pnpm run lint
pnpm run test:unit
pnpm run verify:fast
pnpm run test:e2e:focused tests/e2e/sprites-lab.spec.ts --list
pnpm run test:e2e:focused tests/e2e/sprites-lab.spec.ts
pnpm run verify
```

## Project Structure

```text
packages/game-data/src/maps/
├── types.ts              # MapDefinition, MapTileKind, StairEntry, DecorationPlacement, DressingKind
└── competitive.ts
packages/renderer/src/
├── terrain-conversion.ts # grid ↔ MapDefinition (lossless)
├── terrain-dressing.ts   # scatter + asset keys (imports DressingKind from game-data)
├── terrain-scene.ts      # shared render: terrain, stairs, decorations
└── terrain-layer.ts      # game entry point
apps/web/src/sprites/tabs/
├── TerrainView.tsx       # editor UI (toolbar, status, modals)
├── terrain-controller.ts # editor engine (split into focused modules)
└── terrain-*.ts          # paint / overlays / persistence helpers
tests/unit/
├── terrain-conversion.test.ts
├── terrain-dressing.test.ts
└── terrain-parity.test.ts
tests/e2e/sprites-lab.spec.ts
```

## Data Contract

```ts
// packages/game-data
export type DressingKind =
  | 'bush' | 'tree' | 'rock' | 'cloud' | 'water_rock'
  | 'gold' | 'gold_stone' | 'wood' | 'meat' | 'sheep'

export interface DecorationPlacement {
  readonly x: number
  readonly y: number
  readonly kind: DressingKind
  readonly variant?: number // 0-based; defaults to 0
}

export interface MapDefinition {
  readonly width: number
  readonly height: number
  readonly tiles: readonly MapTileKind[]
  readonly stairs?: readonly StairEntry[]
  readonly palette?: string
  readonly decorationSeed?: number
  readonly decorationCounts?: Readonly<Partial<Record<DressingKind, number>>>
  readonly decorations?: readonly DecorationPlacement[]
}
```

Decoration precedence in the renderer: explicit `decorations` win; otherwise
`decorationCounts` scatter deterministically by `decorationSeed`; otherwise no
decorations. All new fields are optional, so existing maps (including
`createCompetitiveMap`) remain valid.

Round-trip invariant: `mapDefinitionToGrid(gridToMapDefinition(g))` preserves
`land`/`water`/`elevated` and `stairs`. The editor's `LevelData` carries
`decorations` so the lab format also round-trips.

## Code Style

Follow the existing controller pattern: imperative hot-path state owned by the
controller, React driving it through a stable handle, and shared presentation
rules living in `@rts/renderer` (never duplicated in the editor). No `any`;
readonly interfaces; explicit return types on public functions.

## Testing Strategy

- `tests/unit/terrain-conversion.test.ts` — lossless round-trip for terrain and
  stairs.
- `tests/unit/terrain-dressing.test.ts` — scatter determinism and explicit
  placement precedence.
- `tests/unit/terrain-parity.test.ts` (new) — same grid + stairs + decorations
  produce identical scene input for editor and game.
- `tests/e2e/sprites-lab.spec.ts` — grid toggle, highlight, decoration
  placement, autosave restore, and playtest entry point.
- `tests/architecture/public-api.test.ts` and `package-dependencies.test.ts`
  must stay green (no removed exports; renderer may import game-data, not the
  reverse).

Coverage expectation: every new behavior has a failing-first test; the parity
and round-trip invariants are regression-guarded.

## Boundaries

- Always: keep `MapDefinition` additions optional and backward compatible; keep
  the editor and game rendering through the same `TerrainScene`; run typecheck,
  lint, and unit tests after each task.
- Ask first: changing the simulation version or canonical schema; changing the
  competitive map's authored layout; adding new runtime dependencies.
- Never: let the editor write to `simulation` state; remove or rename public
  exports; duplicate autotile/dressing logic in the editor; reintroduce a
  silent lossy conversion.

## Success Criteria

1. A map authored with elevated terrain, stairs, and decorations renders
   identically in the editor and in a playtest match.
2. `gridToMapDefinition` → `mapDefinitionToGrid` is lossless for terrain and
   stairs.
3. The editor shows a toggleable grid and a visible cell/brush highlight, and
   reports cursor coordinates without rebuilding hit areas per paint.
4. Decorations/resources can be placed and removed individually and survive
   export/import.
5. Work survives a page reload via local autosave; maps can be downloaded and
   uploaded as `.json` with validation errors surfaced.
6. Playtest opens the authored map in the game through `?map=local`.
7. `pnpm run verify` is green; architecture barriers unchanged.

## Open Questions

None blocking. Deferred (out of scope for this initiative): undo/redo,
drag-paint, brush size, flood fill, keyboard shortcuts, map resizing,
decoration collision with units, accessibility hardening, and Reset
confirmation. These are tracked in the completed plan at
`tasks/done/level-editor-plan.md`.
