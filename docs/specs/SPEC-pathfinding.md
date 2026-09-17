# Spec: Pathfinding

Module id: `pathfinding`

## Objective

Navigation grid, deterministic A* with an incremental budget, spatial queries, and navigation geometry. Prepared for future expansion (flow fields, hierarchical, local avoidance) without implementing it in the MVP.

## Commands

```bash
pnpm run test:unit -- astar
pnpm run build
```

## Project Structure

```text
packages/pathfinding/src/
├── grid.ts
├── astar.ts
├── heap.ts
├── geometry.ts
└── spatial-index.ts
```

## Code Style

Integer costs; tie-break `f → h → tile index`; no `Math.random`; no platform dependency.

## Testing Strategy

`tests/unit/astar.test.ts` (valid and optimal paths on small fixtures), `tests/simulation/path-budget.test.ts` (serializable incremental search), `tests/integration/nav-invalidation.test.ts` (footprints update navigability). See master plan (phase 3).

## Boundaries

- Always: deterministic budget; search results are part of the state.
- Ask first: change costs/algorithm; change the budget.
- Never: depend on `performance.now` or the real clock.

## Success Criteria

- Optimal paths on small fixtures.
- A paused serialized/restored search produces the same result.
- No corner cutting.

## Open Questions

None.