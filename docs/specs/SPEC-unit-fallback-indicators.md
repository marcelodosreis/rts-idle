# Spec: Unit Fallback Indicators

Module id: `renderer`

## Objective

When sprites are disabled (`?sprites=off`) or art hasn't loaded yet, units render
as colored fallback shapes. Players must be able to distinguish `pawn`, `warrior`,
and `archer` at a glance without relying on color alone.

## Contract

Each fallback unit draws:

1. **Shape** in the owner's color (green/red/blue/yellow):
   - `pawn` → circle (radius 28 px)
   - `warrior` → rounded square (44 × 44 px, corner radius 6)
   - `archer` → upward triangle (vertices at (0, −28), (−24, 16), (24, 16))
2. **Letter** centered on the shape:
   - `pawn` → `P`, `warrior` → `W`, `archer` → `A`
   - White fill, black stroke (width 3), bold, 22 px, resolution 2.
3. **Outline** on the shape: black stroke (width 3, alpha 0.3) for definition.

Two independent visual channels (shape + letter) encode troop type; owner color
encodes side. This serves colorblind users and remains readable at varying zoom levels.

### Lifecycle

- The letter label is a **sibling** of `body` in the container, not a child, so
  it is unaffected by `body.scale` / facing transforms.
- On `swapFrames` (art loads), both the fallback `Graphics` and the label
  `Text` are removed from the display list and destroyed.
- `bodyScale()` / `bodyVisible()` / `glyphNow()` / `shapeNow()` remain
  unaffected.

### Non-goals

- Changing animated sprite rendering.
- Custom fonts or bitmap text.
- Zoom-level LOD (hiding labels at low zoom).
- New art assets.

## Files

- `packages/renderer/src/units/fallback.ts` — pure mapping (`FALLBACK_GLYPH`).
- `packages/renderer/src/units/sprite.ts` — rendering in fallback branch + cleanup.
- Debug chain: `packages/renderer/src/units/layer.ts`,
  `packages/renderer/src/core/renderer.ts`, `packages/renderer/src/core/types.ts`,
  `apps/web/src/features/match/lifecycle/useMatchSession.ts`.

## Tests

- `tests/unit/renderer/unit-fallback.test.ts` — asserts letter and shape per kind.
- `tests/e2e/laboratory/sprite-fallback.spec.ts` — asserts `glyph` and `shape` fields
  match kinds and that the core roster plus Monk and Lancer are present in the 8v8 demo.

```bash
pnpm run test:unit
pnpm run test:e2e:focused tests/e2e/laboratory/sprite-fallback.spec.ts --project=chromium
```

## Acceptance

- [ ] `?sprites=off` shows three distinct shapes + letters.
- [ ] With sprites on, no label/shape remains after art loads.
- [ ] Unit test and E2E pass.
