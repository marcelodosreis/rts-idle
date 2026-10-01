# ADR-018 — Unified resource domain (map-authored trees and gold mines)

Status: Accepted

Date: 2026-09-30

## Context

The simulation represented mineral nodes as an ECS `MineralNode` component
while a later feature added non-ECS, map-authored "natural resources" (trees)
with their own catalog, state, protocol projection, and renderer layer. The two
paths duplicated the whole economy loop: two `GATHER` payload shapes, two phase
vocabularies (`TO_NODE`/`GATHERING` vs `TO_RESOURCE`/`HARVESTING`), two snapshot
projections (`mineralNodes[]` vs resource deltas), two HUD selection flows, and
scalar `costMinerals` prices even though both Wood and Gold existed.

## Decision

- One resource domain in `@rts/shared`: `ResourceKind` (`TREE` | `GOLD_MINE`),
  `ResourceType` (`WOOD` | `GOLD`), and a `ResourceId` deliberately separate
  from `EntityId` define every map-authored source.
- Map-authored resources are not ECS entities. The simulation owns an immutable
  `ResourceCatalog`, compact `ResourceState` amounts, and a resource spatial
  index; definitions and amounts are canonical (simulation version `0.15.0`).
- `GATHER` takes `resourceId`; gather orders use `TO_RESOURCE`, `HARVESTING`,
  `TO_BASE`, and `WAITING_FOR_BASE`.
- `Cargo` carries a `ResourceType`; `PlayerState.resources` holds canonical
  `GOLD`/`WOOD` wallets; `ResourceCost` unifies construction, training, and
  research prices, affordability, spending, and refunds.
- The legacy `MineralNode` component, `naturalResources` map field,
  `mineralNodes` snapshot projection, `costMinerals` fields, and the
  `TO_NODE`/`GATHERING`/`mining` vocabulary are removed with no adapters,
  aliases, deprecated fields, fallback reads, or dual-write paths.

## Alternatives

- **Keep `MineralNode` as an ECS component and add resources separately.**
  Rejected: it preserves two authoritative economy models and forces every
  consumer to reconcile them.
- **Keep compatibility aliases at the TypeScript boundary** (as ADR-013 allowed
  for buildings). Rejected by this migration's explicit rule: zero adapters,
  aliases, deprecated fields, or fallbacks.
- **Store resources as ECS entities.** Rejected: tens of thousands of passive
  resources would inflate entity churn, hashing, and snapshots for no gameplay
  benefit; the benchmark measures the compact catalog at zero ECS entities.

## Consequences

- One protocol shape (`resources[]` plus `resourcesComplete`), one renderer
  layer, one selection/HUD path, and one client economy projection serve both
  trees and gold mines.
- Canonical hashes and the golden fixture changed; pre-0.15.0 snapshots are not
  readable, and there is no silent old-format write path.
- `tests/architecture/legacy-resource-symbols.test.ts` fails the build if the
  removed symbols are reintroduced anywhere except the negative guards
  themselves.
- Future resource kinds extend `ResourceKind`/`RESOURCE_OUTPUTS` and map
  validation; each definition reserves its tile.

## Evidence

- `pnpm run verify` (typecheck, lint, unit, integration, simulation, contracts,
  orders, determinism, architecture, invariants, build).
- Architecture barrier: `tests/architecture/legacy-resource-symbols.test.ts`.
- Browser acceptance: `tests/e2e/economy/economy-playable.spec.ts` covers wood
  gathering, depletion and stump tile reservation, gold mine selection, and
  group harvesting; the economy, production, research, and top bar suites pass.
- Scale: `pnpm run benchmark -- --suite resources --entities 100,1000,10000,50000`
  reports zero ECS entities and sub-6 ms nearest-resource lookups.
