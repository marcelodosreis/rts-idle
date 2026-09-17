# Spec: Game Data

Module id: `game-data`

## Objective

Declarative definitions of units, buildings, research, abilities, and maps, with validation of references, limits, and cycles. Compiled into an immutable hashed `Ruleset`.

## Commands

```bash
pnpm run test:unit -- ruleset
pnpm run build
```

## Project Structure

```text
packages/game-data/src/
├── schemas/
├── units/
├── buildings/
├── upgrades/
├── abilities/
├── maps/
└── ruleset.ts
```

## Code Style

Declarative data; types inferred from schemas; no scattered `if (unit === "Soldier")`. Numbers centralized, never scattered.

## Testing Strategy

`tests/unit/ruleset-validation.test.ts` covers references, limits, cycles, costs, and prerequisites. `tests/unit/vanguard-m1-data.test.ts`, `nexus-m1-data.test.ts`, `buildings-m1-data.test.ts`, `upgrades-m1-data.test.ts`, and `competitive-map.test.ts` follow the master plan (phase 4A).

## Boundaries

- Always: validate references; hash the ruleset; symmetric maps.
- Ask first: change balance/faction identity; add units.
- Never: gameplay logic outside the simulation systems.

## Success Criteria

- `rulesetHash` is stable for the same input.
- No invalid references.
- Competitive map with exactly two passages and 180° symmetry.

## Open Questions

None.