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
  game-data/    Declarative content (units, buildings, upgrades, maps)  [placeholder]
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

## Simulation core layout

```text
simulation/src/
  contracts/     Public types: commands, orders, rules identity, simulation
                 options, SIMULATION_VERSION, createRulesIdentity
  commands/      apply-command.ts (dispatch) + one handler per command
                 (move, stop, hold, patrol, attack, attack-move, surrender),
                 validate-units.ts (shared atomic validation), limits.ts
  data/          unit-stats.ts (combat stats), economy-rules.ts (v0 constants)
  engine/        create-simulation.ts, simulation-from-snapshot.ts,
                 simulation-host.ts (contract), simulation.ts (the class)
  ecs/           component-store.ts, components.ts, world.ts, create-world.ts
  canonical/     writer.ts, reader.ts, utf8.ts, error.ts
  snapshot/      serialize.ts (state codec), hash.ts (SHA-256 + hex)
  state/         state.ts (GameState, players, Phase)
  systems/       pipeline.ts (frozen order), orders-system, movement-system,
                 movement-step, economy-system, combat-system, death-system,
                 victory-system, events.ts
  invariants/    check-invariants.ts (runs last, never mutates)
  formation.ts   Deterministic formation spiral
  determinism-fixture.ts   Browser/benchmark determinism fixture (`./fixtures`)
```

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
  types.ts       Public contract: GameRenderer, RenderFrame, RenderUnit, options
  renderer.ts    PixiRenderer orchestrator (Application + viewport + wiring)
  unit-layer.ts  Unit lifecycle + positions + interpolation
  unit-sprite.ts One unit's sprite: idle/run/attack frames, HP bar, facing
  effects-layer.ts  Combat feedback: streaks, damage popups, explosions
  hp-bar.ts      Pure health-bar math (ratio, color, fill width)
  selection.ts   Box selection + selection rings + selection set
  ping.ts        Right-click command ping
  terrain-*      Terrain tileset/autotile/dressing presentation
```

The renderer never computes gameplay; it presents frames and reports
selection/commands outward through callbacks.

## Web layout

```text
web/src/
  app/          App root
  screens/      MatchScreen (thin), useMatchSession (lifecycle + debug API)
  client/       connection.ts (WS + protocol guards), snapshot-to-frame.ts (pure)
  det/, perf/   Diagnostic harness pages (excluded from the dependency barrier)
```

## Shared reusable modules

| Concept | Where | Used by |
|---|---|---|
| Fixed point (`Fixed`, `FIXED_SCALE`, `tilesToFixed`, `gridPosition`) | `shared/fixed.ts` | simulation, demo, web, fixtures |
| RNG (xoshiro128** in 6 cohesive files) | `shared/rng/` | simulation |
| IDs (`EntityId`, `PlayerId`, allocation) | `shared/ids.ts`, `shared/players.ts` | simulation, protocol |
| Rules identity factory | `simulation/contracts/rules-identity.ts` | demo, benchmark, fixtures, tests |
| Wire messages + guards | `protocol/src/messages/` | server, web |
| Test fixtures (`worldWithOwners`, `buildMoveCommand`, seeds) | `tests/fixtures/` | integration/simulation tests |

## Boundaries (non-negotiable)

- The simulation never imports protocol, renderer, ai, or platform APIs.
- The renderer never imports the simulation's ECS/GameState.
- The web app (excluding diagnostic harness pages) never imports the
  simulation.
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
