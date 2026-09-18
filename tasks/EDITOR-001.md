# Task Packet: EDITOR-001 — Map Contract

## Task

- ID: `EDITOR-001`
- Objective: move `DressingKind` into `@rts/game-data` and extend
  `MapDefinition` with explicit decoration placement plus scatter counts.
- Why: gives the editor and renderer a single, lossless map contract so
  decorations can be authored item by item and rendered by the game.
- Scope: `packages/game-data/src/maps/`, `packages/renderer/src/terrain-dressing.ts`,
  `packages/renderer/src/index.ts`, affected unit tests.
- Non-goals: changing the conversion functions, rendering behavior, the editor
  UI, or any simulation code.

## Read first

- `docs/specs/SPEC-level-editor.md` (Data Contract)
- `packages/game-data/src/maps/types.ts`
- `packages/game-data/src/index.ts`
- `packages/renderer/src/terrain-dressing.ts`
- `packages/renderer/src/index.ts`
- `tests/unit/terrain-dressing.test.ts`

## Contract

Add to `game-data`:

```ts
export type DressingKind =
  | 'bush' | 'tree' | 'rock' | 'cloud' | 'water_rock'
  | 'gold' | 'gold_stone' | 'wood' | 'meat' | 'sheep'

export interface DecorationPlacement {
  readonly x: number
  readonly y: number
  readonly kind: DressingKind
  readonly variant?: number
}
```

Extend `MapDefinition` with optional `decorations?: readonly DecorationPlacement[]`
and `decorationCounts?: Readonly<Partial<Record<DressingKind, number>>>`.

`packages/renderer/src/terrain-dressing.ts` imports `DressingKind` from
`@rts/game-data` and re-exports it so `@rts/renderer`'s public surface is
unchanged. No reverse dependency (game-data must not import renderer).

Invariants: all additions optional and backward compatible; the competitive map
remains valid; `public-api` and `package-dependencies` barriers stay green.

## Tests and validation

```bash
pnpm run typecheck
pnpm run lint
pnpm run test:unit
pnpm run test:architecture
```

Expected new/updated tests: `tests/unit/terrain-dressing.test.ts` still passes
with the imported type; add a compile-level assertion that a `MapDefinition`
with `decorations` and `decorationCounts` type-checks.

## Acceptance and stop conditions

- [ ] `DressingKind` and `DecorationPlacement` live in `game-data` and are
      exported publicly.
- [ ] `MapDefinition` accepts `decorations` and `decorationCounts` as optional
      fields.
- [ ] `@rts/renderer` re-exports `DressingKind`; no public export removed.
- [ ] No reverse import; architecture barriers pass.
- [ ] Scope complete; stop without touching conversion or render behavior.

## Completion report

Report `PASS` or `BLOCKED`, implemented behavior, tests, validation status,
changed files, and architectural changes. Keep the report under 30 lines.
