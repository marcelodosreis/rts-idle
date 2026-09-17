# Implementation Plan: Unified Sprite Lab redesign (`/sprites`)

## Overview

Replaces the 9 stacked sections of the `/sprites` lab with a tabbed shell and a
unified asset browser. The browser derives every category from the manifest (all
446 assets always visible, including unique ones), renders each asset with the
established lab standard (crop to visible pixels, `0.5/0.5` anchor, 1:1 native
scale), and provides persistent navigation (sidebar + breadcrumb + prev/next +
keyboard) so switching never loses state. Also fixes the perf-stress sprites
that never actually animate.

## Decisions

1. Tab shell: `Browse · Terrain · Stress · Report`. Active tab persisted in
   `location.hash`. Lazy mount per tab; destroy on unmount.
2. Browse = 3 panes (sidebar nav / central canvas / inspector).
3. Single selection model `{ tab, categoryPath, searchQuery, key }`; the list
   re-renders but selection is never destroyed.
4. `catalog.ts` auto-derives categories from the manifest (pure, unit-testable).
5. Canvas reuses `lab/crop.ts` + `lab/player.ts` (1:1 native, visible crop).
6. Type-specific controls in the inspector (units flip/walk/shadow, fx blend,
   buildings variant/footprint, terrain tileset grid).
7. Native controls + visible focus + keyboard ←/→ + `aria-live` readout.

## Tasks

### Phase 0 — Foundation
- T1 `catalog.ts` (derive categories/search from manifest)
- T2 `main.ts` shell (tabs, hash routing, lazy mount, `__spriteLab.browse/tab`)

### Phase 1 — Browse functional
- T3 `browse/nav.ts` sidebar (search + categories + list, persistent selection)
- T4 `browse/canvas.ts` (1:1 native render, strips animate, tilesets grid+variant)
- T5 `browse/inspector.ts` (readout, overlays, validate, per-type controls)

### Phase 2 — Navigation & polish
- T6 breadcrumb + prev/next + keyboard + focus + aria-live
- T7 responsive + empty/loading states

### Phase 3 — Tab ports
- T8 `tabs/terrain.ts` (port terrain-playground)
- T9 `tabs/stress.ts` (port perf-stress + `play()` fix)
- T10 `tabs/report.ts` (merge manifest-report + game-mapping)

### Phase 4 — Cleanup, tests, docs
- T11 remove `sections/`
- T12 rewrite `tests/e2e/sprites-lab.spec.ts`
- T13 docs (capabilities.md, ledger) + `pnpm verify`

## Checkpoints
- CP1 after T2: typecheck/lint/build + shell e2e.
- CP2 after T5: Browse end-to-end (select → view → validate).
- CP3 after T10: all tabs functional.
- CP4 final: `pnpm verify` + visual + a11y inspection.

## Risks
- E2E tied to old DOM → keep `__spriteLab` hook + `browse(key)`/`tab()`; rewrite
  spec in T12.
- Lazy mount vs global checks → `registerChecks` only on tab mount (current
  pattern); "run all checks" tolerates unmounted tabs.
- Pixi app leaks → `destroy()` on tab unmount.
- Terrain playground (718 lines) port risk → pure move + existing checks.