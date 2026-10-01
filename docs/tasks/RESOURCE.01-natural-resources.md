# Task Packet: RESOURCE.01 — Natural Resources Visual Completion

- ID: `RESOURCE.01`
- Objective: complete authoritative natural-resource presentation and placement rules so trees are visible with or without assets, remain as stumps after depletion, and permanently reserve their terrain tiles.
- Why: the resource protocol and simulation path work, but the current Pixi particle buffer is not uploaded and the player cannot see the tree reliably.
- Scope: renderer resource presentation, map placement validation, browser debug, E2E regression, documentation, benchmark, and quality gates.
- Non-goals: pathfinding, unit collision, physical movement blocking, automatic retargeting, multiplayer rooms, or migrating Mineral Nodes.

## Read first

- `docs/engineering-standard.md`
- `docs/architecture.md`
- `packages/renderer/src/resources/resource-layer.ts`
- `packages/renderer/src/core/renderer.ts`
- `packages/shared/src/maps/map.ts`
- `packages/shared/src/maps/placement.ts`
- `apps/server/src/bootstrap/map-validation.ts`
- `tests/e2e/economy/economy-playable.spec.ts`
- `tools/benchmark/src/natural-resources.ts`

## Contract

The server catalog delivers immutable natural-resource definitions. Active trees use a shared minimal geometric marker, with no tree art asset loaded at runtime. The Pixi particle buffer is uploaded after every static rebuild. When `remaining` reaches zero, the resource remains at the same position as a visible stump and is no longer a valid gather target.

Natural-resource tiles must be inside the map, on `land` or `elevated` terrain, unique, and not overlap scenario spawns, mineral nodes, or initial building footprints. Their tiles are permanently invalid for construction, including after depletion. This is a placement reservation only; units may cross the tile until pathfinding and collision are implemented.

The player-facing route is `/?scenario=regression&aggression=passive&sprites=off`. The player can see a dense group of 40 trees in the lower-left opposite corner, select an active or depleted tree, select a Worker, issue GATHER, observe cutting/carrying feedback, see Wood increase independently from Minerals, and observe a persistent stump after depletion. The stump rejects GATHER and construction on its tile is visibly and authoritatively rejected.

The renderer exposes read-only `window.__rtsDebug.getNaturalResources()` and `getResourceRenderStats()` diagnostics. No simulation mutation reference crosses the boundary.

## Design

- `ResourceLayer` owns presentation-only chunk materialization, texture selection, upload, and hit-test coordinates.
- Shared map placement owns permanent invalid resource tiles.
- Server bootstrap owns authored-map semantic validation against terrain and scenario content.
- Simulation remains authoritative for amounts, cargo, deposit, snapshots, restore, and hashes.
- Fallback textures are generated once and reused by particle containers; no per-resource Graphics/Sprite objects are created at scale.
- Closed visual states use typed registries and exhaustive dispatch where applicable.

## Tests and validation

```bash
pnpm run verify:fast
pnpm run verify:simulation
pnpm run test:e2e:focused tests/e2e/economy/economy-playable.spec.ts --list
CI=1 E2E_WORKERS=1 pnpm run test:e2e tests/e2e/economy/economy-playable.spec.ts --project=chromium --project=firefox --grep-invert @perf
CI=1 E2E_WORKERS=1 pnpm run test:e2e:perf
pnpm run verify
CI=1 E2E_WORKERS=1 pnpm run test:e2e:fast
pnpm run test:e2e:all
pnpm run benchmark -- --suite resources --entities 100,1000,10000,50000
```

## Player-facing completion

- [x] The player sees an active tree as a minimal marker, independent of sprite assets.
- [x] The player can select the tree and issue GATHER.
- [x] Cutting, carrying, Wood deposit, and depletion feedback are visible.
- [x] A depleted tree remains as a visible stump and rejects GATHER.
- [x] The stump tile rejects construction permanently.
- [x] The real server route is covered by Chromium and Firefox E2E.

## Acceptance and stop conditions

- [x] ParticleContainer static data is uploaded after initial and changed chunk rebuilds.
- [x] Resource definitions in water, outside the map, duplicated, or overlapping authored content are rejected.
- [x] Visible chunks are materialized lazily and 50k resources remain outside ECS.
- [x] Renderer, simulation, contract, integration, E2E, performance, benchmark, and full verification gates pass.
- [x] Task index, current state, smoke documentation, and postmortem status are synchronized.
