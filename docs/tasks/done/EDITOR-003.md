# Task Packet: EDITOR-003 — Game Render Parity

## Task

- ID: `EDITOR-003`
- Objective: the game derives its terrain scene input from the same shared
  conversion the editor uses, including elevated, stairs, and dressing.
- Why: after EDITOR-002 the conversion is lossless, but the game layer still
  discards dressing; parity must be a single, testable seam.
- Scope: `packages/renderer/src/terrain-conversion.ts` (pure scene-input
  helper), `packages/renderer/src/terrain-layer.ts`, new
  `tests/unit/terrain-parity.test.ts`.
- Non-goals: editor decoration placement UI (EDITOR-020) and explicit
  decoration item rendering in `TerrainScene` (EDITOR-021); browser playtest
  (EDITOR-030).

## Read first

- `docs/specs/SPEC-level-editor.md` (Data Contract)
- `packages/renderer/src/terrain-conversion.ts`
- `packages/renderer/src/terrain-layer.ts`
- `packages/renderer/src/terrain-scene.ts`

## Contract

Add a pure helper used by the game layer:

```ts
export interface TerrainDressingInput {
  readonly seed: number
  readonly counts: Readonly<Partial<Record<DressingKind, number>>>
}

export interface TerrainSceneInput {
  readonly grid: AutoTileTerrain[][]
  readonly stairs: Map<string, 'left' | 'right'>
  readonly dressing: TerrainDressingInput
}

export function mapToTerrainSceneInput(map: MapDefinition): TerrainSceneInput
```

- `grid`/`stairs` come from `mapDefinitionToGrid` (elevated and stairs
  preserved).
- `dressing.seed` is `map.decorationSeed ?? 1`; `dressing.counts` is
  `map.decorationCounts ?? {}` (no scatter when the map declares none).
- `TerrainLayer.build` renders through this helper so editor and game share one
  path. Explicit decoration items are added to the input in EDITOR-021.

## Tests and validation

```bash
pnpm run test:unit -- terrain-parity
pnpm run typecheck
pnpm run lint
pnpm run test:architecture
pnpm run test:e2e:focused tests/e2e/renderer-lifecycle.spec.ts --list
pnpm run test:e2e:focused tests/e2e/renderer-lifecycle.spec.ts
```

## Acceptance and stop conditions

- [ ] `mapToTerrainSceneInput` preserves elevated, stairs, palette seed, and
      dressing counts.
- [ ] `TerrainLayer.build` uses the helper; no dressing is silently discarded.
- [ ] Architecture barriers pass; public API only gains exports.
- [ ] Visual spike confirms the game still boots with elevated/stairs terrain.
- [ ] Scope complete; do not add editor UI or explicit decoration rendering.

## Completion report

Report `PASS` or `BLOCKED`, implemented behavior, tests, validation status,
changed files, and architectural changes. Keep the report under 30 lines.
