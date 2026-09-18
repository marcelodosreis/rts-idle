# Task Packet: EDITOR-002 — Lossless Terrain/Stairs Conversion

## Task

- ID: `EDITOR-002`
- Objective: make `mapDefinitionToGrid` preserve elevated terrain and stairs,
  and carry explicit decorations through both conversion directions.
- Why: the editor currently paints elevated/stairs/decorations that the export
  silently flattens or drops, so the authored map never matches the game.
- Scope: `packages/renderer/src/terrain-conversion.ts`,
  `tests/unit/terrain-conversion.test.ts`.
- Non-goals: re-enabling the game render (EDITOR-003), editor UI, decoration
  placement tools.

## Read first

- `docs/specs/SPEC-level-editor.md` (Data Contract)
- `packages/renderer/src/terrain-conversion.ts`
- `packages/game-data/src/maps/types.ts`
- `tests/unit/terrain-conversion.test.ts`

## Contract

- `mapDefinitionToGrid` returns `{ grid, stairs, decorations }`:
  - `grid` preserves `elevated` (no flattening) and applies the water border.
  - `stairs` is rebuilt from `map.stairs` (empty when absent).
  - `decorations` is `map.decorations ?? []`.
- `gridToMapDefinition` accepts `options.decorations` and emits `map.decorations`
  when provided.
- Round-trip invariant: `gridToMapDefinition(grid, { stairs, decorations,
  palette, decorationSeed })` → `mapDefinitionToGrid` preserves terrain, stairs,
  decorations, palette, and seed.

## Tests and validation

```bash
pnpm run test:unit -- terrain-conversion
pnpm run typecheck
pnpm run lint
pnpm run test:architecture
```

Update `tests/unit/terrain-conversion.test.ts`: replace the flatten/drop
expectations with lossless ones and add a decoration round-trip test.

## Acceptance and stop conditions

- [ ] Elevated terrain survives the round-trip.
- [ ] Stairs survive the round-trip; missing stairs default to empty.
- [ ] Explicit decorations survive both directions.
- [ ] No public API removed; architecture barriers pass.
- [ ] Scope complete; do not touch render behavior or the editor.

## Completion report

Report `PASS` or `BLOCKED`, implemented behavior, tests, validation status,
changed files, and architectural changes. Keep the report under 30 lines.
