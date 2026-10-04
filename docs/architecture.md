# Architecture — rts-idle

This document describes the **current** module layout, boundaries, and shared
concepts. Design rationale and contracts live in `docs/master-plan.md` and
`docs/adr/`. Engineering rules for writing code live in
`docs/engineering-standard.md`.

## Packages and applications

```text
apps/
  server/   Node service: one isolated GameSession per connection, WS transport
  web/      React app: match screen, renderer orchestration, network client
packages/
  shared/       Deterministic primitives (no dependencies)
  game-data/    Declarative content (units, buildings, upgrades, maps)
  pathfinding/  Grid + incremental A* + spatial queries                  [placeholder]
  protocol/     Versioned wire messages + runtime guards
  simulation/   Deterministic simulation core (single writer)
  renderer/     PixiJS presentation
  ai/           Agent decisions from observations                        [placeholder]
  audio/        Audio cues                                               [placeholder]
tools/
  benchmark/  Simulation performance harness
  balance/    Balance tooling (stub)
```

Dependency direction (enforced by `tests/architecture/package-dependencies.test.ts`):

```text
shared → game-data → simulation → { server, ai }
       → pathfinding ↗
       → protocol  → { server, web, renderer }
                     → renderer → web
```

## Physical organization

The repository is organized by domain first and responsibility second. A folder
is introduced only when it contains a real cohesive group; placeholder packages
remain flat until implementation exists.

Package conventions:

- `shared`: `primitives/`, `domain/`, `maps/`, `assets/`, and `rng/`.
- `simulation`: `contracts/`, `commands/`, `data/`, `domain/`, `engine/`, `ecs/`,
  `state/`, `orders/`, `movement/`, `placement/`, `systems/`, `invariants/`,
  `canonical/`, `snapshot/`, and `fixtures/`.
- `renderer`: `core/`, `assets/`, `input/`, `terrain/`, `units/`, `world/`, and
  `effects/`.
- `protocol`: `messages/` is the stable wire-contract boundary.

Server conventions:

- `bootstrap/` composes matches and validates authored content.
- `transport/` owns HTTP, WebSocket, decoding, and snapshot delivery.
- `sessions/` owns authoritative session state and projections.
- `content/demo/` owns demo scenarios and deterministic seeding.
- `index.ts` is the server public surface; `main.ts` is the executable entry point.

Quality tooling conventions:

- `tools/quality/` separates front-matter parsing, status data, rendering, and
  the `postmortem-status.ts` executable.

Test conventions:

- `tests/unit/` is grouped by owning package or application domain.
- `tests/simulation/` is grouped into `combat/`, `economy/`, `lifecycle/`, and
  `serialization/`; `hash-golden.test.ts` remains at the suite root.
- `tests/fixtures/` keeps simulation fixtures in `simulation/`. The shared,
  pinned seed catalog is intentionally the exact root file `seeds.ts`.
- `tests/e2e/` is grouped by user flow: `match/`, `economy/`, `laboratory/`,
  `responsive/`, `regression/`, and `support/`.
- `tests/e2e/laboratory/` splits feature flows into `browser/`, `diagnostics/`,
  and `editor/`; its cross-cutting laboratory specs remain at that suite root.

`apps/web` uses a feature-first layout with cohesive React segments. Its source
files use kebab-case names, features expose explicit public APIs, and
non-generated React files contain one component each.

## Simulation core layout

```text
simulation/src/
  contracts/     Public types: commands, orders, rules identity, simulation
                 options, SIMULATION_VERSION, createRulesIdentity
  commands/      apply-command.ts (dispatch) + one handler per command
                 (move, stop, hold, patrol, attack, attack-move, surrender),
                 validate-units.ts (shared atomic validation), limits.ts
  data/          economy-rules.ts, production-rules.ts, supply-rules.ts
  engine/        create-simulation.ts, simulation-from-snapshot.ts,
                 simulation-host.ts (contract), simulation.ts (the class)
  ecs/           component-store.ts, components.ts, building-component.ts,
                 world.ts, create-world.ts
  canonical/     writer.ts, reader.ts, utf8.ts, error.ts
  snapshot/      serialize.ts (state codec), hash.ts (SHA-256 + hex)
  state/         state.ts (GameState, players, Phase)
  systems/       pipeline.ts (frozen order), orders-system, movement-system,
                 movement-step, economy-system, combat-system, death-system,
                 victory-system, events.ts
  invariants/    check-invariants.ts (runs last, never mutates)
  domain/        Building predicates and deterministic formation rules
  fixtures/      Simulation fixture helpers
  determinism-fixture.ts  Browser/benchmark determinism fixture
```

Unit definitions and capabilities live in `packages/game-data/src/units.ts`.
`engine/observation.ts` is the immutable simulation-to-server boundary: it
copies nested component data before transport consumes it. Protocol
`snapshot`/`snapshot_delta` messages are the wire boundary; the server's
`SnapshotSender` maps observations to those messages without exposing ECS state.

Invariants:

- `step()` is the only mutation path; commands are applied through
  `commands/apply-command.ts`, which validates before writing (atomicity).
- The canonical byte format (ADR-002/011) is pinned by
  `tests/simulation/hash-golden.test.ts`.
- `SimulationHost` is the single public entry point; ECS internals are not
  exported for mutation.

## Renderer layout

```text
renderer/src/
  core/          Public contracts, renderer orchestration, layers, interpolation
  input/         Typed pointer/context input, hit testing, and shared camera policy
  units/         Unit lifecycle, sprites, fallback, economy animation
  world/         Buildings and world-object presentation
  effects/       Combat feedback, selection, ping, progress bars
  terrain/       Terrain tileset/autotile/dressing presentation
```

The renderer never computes gameplay; it presents frames and reports typed world
interactions outward. The web match layer translates those interactions into
gameplay commands. Camera state remains presentation-only.
All world-space visuals are mounted through the persistent containers owned by
`RenderLayers`; renderer components do not add gameplay visuals directly to the
viewport. The layer order is terrain, world objects, units, selection, effects,
interaction, and debug.

## Web layout

```text
web/src/
  app/          Bootstrap, providers, typed router, route errors
  pages/        Named route composition (`match/` and `laboratory/`)
  features/     Domain slices with `components/`, `hooks/`, `services/`,
                `types/`, `lib/`, and an explicit `index.ts` public API
  shared/       Transport, config, reusable components, and UI primitives
```

Within `features/`, cross-slice imports go through a slice public API using the
`@/` alias; local implementation imports stay relative. `services/` owns
stateful orchestration, runtime objects, controllers, and I/O; `types/` owns
types and closed registries; `lib/` owns pure helpers. Generated
`shared/ui/**` is exempt from these conventions. A large feature may own an
internal shared segment (for example `features/laboratory/shared/`); its
sub-areas import that segment relatively, because it is not a separate slice and
must not be reached from other features.

## Shared reusable modules

| Concept | Where | Used by |
|---|---|---|
| Fixed point (`Fixed`, `FIXED_SCALE`, `tilesToFixed`, `gridPosition`) | `shared/primitives/` | simulation, server content, web, fixtures |
| RNG (xoshiro128** in 6 cohesive files) | `shared/rng/` | simulation |
| IDs (`EntityId`, `PlayerId`, allocation) | `shared/domain/` | simulation, protocol |
| Rules identity factory | `simulation/contracts/rules-identity.ts` | demo, benchmark, fixtures, tests |
| Wire messages + guards | `protocol/src/messages/` | server, web |
| Test fixtures (`worldWithOwners`, `buildMoveCommand`) | `tests/fixtures/simulation/` | integration/simulation tests |
| Pinned test seeds | `tests/fixtures/seeds.ts` | integration/simulation tests |

## Boundaries (non-negotiable)

- The simulation never imports protocol, renderer, ai, or platform APIs.
- The renderer never imports the simulation's ECS/GameState.
- The playable web app never imports the simulation. The Laboratory determinism
  route is an explicitly isolated browser diagnostic harness and is excluded
  from the playable package dependency barrier.
- No package imports another package's internals via relative paths; all
  cross-package access goes through the package's public exports.
- The authorized mutability exception covers only the simulation core's
  private GameState (see `AGENTS.md` and ADR-001).

## Documentation map

- `docs/engineering-standard.md` — how to write code (source of truth).
- `docs/master-plan.md` — full design, phases, acceptance criteria.
- `docs/adr/` — decisions (Context/Decision/Alternatives/Consequences/Evidence).
- `docs/specs/` — capability map + per-module specs.
- `docs/rfc/` — technology substitutability RFCs (tracking + incremental plan).
- `docs/postmortems/` — every bug's root cause + regression.
Building state is represented by one `Building` component in the simulation.
Its explicit lifecycle is `FOUNDATION` → `UNDER_CONSTRUCTION` → `COMPLETED`;
initial bases are completed values of the same component. Protocol snapshots
and renderer frames expose only `buildings` for the ECS; map-authored resources
live in the non-ECS `resources` catalog and project as mutable `resources`
states (Gold Mine → Gold, Tree → Wood).
