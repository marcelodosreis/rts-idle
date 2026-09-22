# Implementation master plan — Browser RTS

**Approved graphics stack: PixiJS v8 + pixi-viewport.**

This plan covers the foundation, the first complete game, and the content expansion. The architectural decisions are defined; decisions conditioned on measurements have explicit criteria and escalation rules.

**Status of this deliverable:** planning complete. No file was changed, no dependency was installed, and no spike was presented as executed.

---

# 1. Environment audit

## 1.1. Collected evidence

| Item | Result |
|---|---|
| Directory | `/home/marcelo/Projects/rts-idle` |
| System | Linux x86_64 on WSL2 |
| CPU | AMD Ryzen 5 2600, 6 cores / 12 threads |
| Memory available to WSL | Approximately 7.7 GiB |
| Node | `24.15.0` |
| npm | `11.12.1` |
| pnpm | `10.33.2` |
| Corepack | `0.34.6` |
| Git | `2.47.3` |
| GitHub CLI | Found in `PATH` |
| Branch | `main` |
| Working tree | Clean |
| Existing commit | `95a0ab2` — bootstrap of workflows and rules |
| Application code | Does not exist |
| Manifest/dependencies | Do not exist |
| Local TypeScript | Not configured |
| Tests/build/CI | Not configured |
| Executable browser in `PATH` | Not found |
| Effective GPU/WebGL2 | Not verified |

Current structure:

```text
rts-idle/
├── .git/
├── .opencode/
└── AGENTS.md
```

## 1.2. Verified graphics libraries

From the npm registry query:

- `pixi.js`: `8.20.1`.
- `pixi-viewport`: `6.0.3`.
- `pixi-viewport` declares compatibility with `pixi.js >= 8`.

These are the **initial candidate versions for the spike**, not versions already approved by the project.

## 1.3. Implications for execution

1. Create the monorepo directly at the current root.
2. Preserve the existing contents of `.opencode/`.
3. Register the approved mutability exception for the core.
4. Install test browsers only during authorized execution.
5. Identify GPU, driver, and graphics backend before validating visual performance.
6. Do not use software GPU results as proof of performance on real hardware.

---

# 2. Scope and delivery milestones

## 2.1. Milestone M1 — Complete playable RTS

Deliver:

- One competitive map.
- Two factions.
- Three units per faction, including worker.
- Mineral and Energy.
- Construction, production, supply, repair, and research.
- Combat, projectiles, navigation, collision, and fog.
- Full RTS controls planned in this plan.
- Room with four slots in the structure.
- Initial map limited to two participants.
- Human vs Bot through the real server flow.
- Agent interface.
- Victory, defeat, draw, and shutdown.
- Basic reconnection.
- Reproducible replay.
- Headless CLI, fuzz, and benchmarks.
- CI and automated E2E flow.

Unit roster:

| Vanguard | Nexus |
|---|---|
| Worker | Worker |
| Soldier | Drone |
| Ranger | Pulse |

Available buildings:

- Base, including new expansion bases.
- Supply.
- Barracks.
- Tech Lab.

Research:

- Attack.
- Economy.

## 2.2. Milestone M2 — Expanded MVP

Add:

- Eight units per faction.
- Factory and Defense.
- Six research topics per faction.
- Representative abilities using the generic contract.
- AI covering technology, expansion, and expanded composition.
- Agent vs Agent, Bot vs Bot, and Agent vs Bot validated.
- Technical scenario with four participants.
- Complete balance tooling.
- Expanded stress and validation.
- Audio, onboarding, and visual polish.

**M1 is a complete game. M2 completes the expanded content of the prompt.**

## 2.3. Product limits

Initial mode: desktop, keyboard and mouse, accountless matches.

Not included in this execution:

- Login, ranking, monetization, and social features.
- Automatic matchmaking.
- Four-player competitive mode on a second commercial map.
- Live spectator.
- Procedural maps.
- Roguelike.
- LLM dependency.
- Complex distributed infrastructure.

These items remain recorded in the backlog, with the relevant extension points.

---

# 3. Closed architectural decisions

| Topic | Decision |
|---|---|
| Language | Strict TypeScript |
| Organization | pnpm monorepo |
| Simulation | Portable, synchronous, deterministic package |
| ECS | Own, small, data-oriented |
| State writes | Single writer: simulation execution |
| Transport | WebSocket |
| Authority | Node server |
| Client | Filtered replica, input, and presentation |
| Initial multiplayer | Authoritative replication; no lockstep between clients |
| Rendering | PixiJS v8 |
| Camera | pixi-viewport |
| Initial graphics backend | WebGL2 |
| WebGPU | Experiment conditioned on the spike |
| UI | React, outside the world's visual tree |
| Navigation | Grid + incremental A* with deterministic budget |
| Physics | Own movement and collision, no physics engine |
| Numeric state | Integers and fixed point |
| Replay | Initial state + versioned rules + canonical commands |
| Persistence | Memory for rooms; files for replays and failures |
| Deploy | Static web + one Node service |
| Scale | Measure before adding processes or services |

## 3.1. Two clocks

```text
Simulation:
discrete tick → match rules

Presentation:
PixiJS frame → interpolation, camera, animation and drawing
```

The PixiJS ticker **does not advance the authoritative simulation**.

## 3.2. Two kinds of integrity

**Simulation integrity**

```text
same initial state + same rules + same commands
→ same hashes
```

**Replica integrity**

```text
snapshots/deltas applied by the client
→ same filtered view that the server published
```

The client will not have the complete state needed to recompute the global match hash. This separation avoids contradicting the fog of war.

---

# 4. Modules and dependencies

## 4.1. Responsibilities

| Module | Responsibility |
|---|---|
| `shared` | Primitive types, deterministic arithmetic, and portable utilities |
| `game-data` | Units, buildings, research, abilities, and maps |
| `pathfinding` | Grid, A*, spatial queries, and navigation geometry |
| `simulation` | GameState, ECS, commands, systems, observations, and snapshots |
| `protocol` | Public messages, network validation, and versioning |
| `ai` | Strategic/tactical decisions from observations |
| `renderer` | PixiJS world, camera, visual selection, and effects |
| `audio` | Playback of allowed visual/audio cues |
| `server` | Rooms, sessions, authority, transport, and recording |
| `web` | Menus, HUD, network client, and input translation |
| `tools/*` | Headless execution, replay, balance, and fuzz |

## 4.2. Dependency direction

```text
shared
├── game-data
├── pathfinding
└── protocol

shared + game-data + pathfinding
└── simulation

simulation/contracts + game-data
└── ai

simulation + ai + protocol
└── server

protocol + shared + PixiJS + pixi-viewport
└── renderer

protocol + renderer + audio + public catalog
└── web

simulation + ai
└── headless tools
```

Rules:

- `simulation` does not import `protocol`.
- `protocol` does not import the simulation's internal state.
- `ai` accesses only permitted exports of contracts.
- `renderer` does not import the ECS.
- `web` does not run live match gameplay.
- `shared` does not become a dumping ground for gameplay rules.

## 4.3. Automated barriers

Implement:

1. Simulation `tsconfig` without DOM libraries and without Node types.
2. Import restrictions via Biome.
3. Dependency graph test, including prohibited transitive imports.
4. Explicit exports in manifests.
5. Test that bundles and runs the simulation in the browser.
6. Prohibition of internal imports via relative paths crossing packages.

---

# 5. Planned file structure

```text
rts-idle/
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── app/
│   │       ├── screens/
│   │       ├── room/
│   │       ├── hud/
│   │       ├── client/
│   │       │   ├── connection.ts
│   │       │   ├── replica.ts
│   │       │   ├── delta-reducer.ts
│   │       │   └── command-controller.ts
│   │       └── input/
│   │           ├── hotkeys.ts
│   │           └── control-groups.ts
│   └── server/
│       └── src/
│           ├── transport/
│           ├── rooms/
│           ├── sessions/
│           ├── replication/
│           ├── replay/
│           ├── observability/
│           └── main.ts
│
├── packages/
│   ├── shared/src/
│   │   ├── ids.ts
│   │   ├── fixed.ts
│   │   ├── rng.ts
│   │   └── canonical/
│   ├── game-data/src/
│   │   ├── schemas/
│   │   ├── units/
│   │   ├── buildings/
│   │   ├── upgrades/
│   │   ├── abilities/
│   │   ├── maps/
│   │   └── ruleset.ts
│   ├── pathfinding/src/
│   │   ├── grid.ts
│   │   ├── astar.ts
│   │   ├── heap.ts
│   │   ├── geometry.ts
│   │   └── spatial-index.ts
│   ├── simulation/src/
│   │   ├── contracts/
│   │   ├── state/
│   │   ├── ecs/
│   │   ├── commands/
│   │   ├── systems/
│   │   ├── observation/
│   │   ├── snapshot/
│   │   ├── invariants/
│   │   └── engine.ts
│   ├── protocol/src/
│   │   ├── envelope.ts
│   │   ├── room.ts
│   │   ├── commands.ts
│   │   ├── observation.ts
│   │   ├── replication.ts
│   │   └── errors.ts
│   ├── ai/src/
│   │   ├── contracts.ts
│   │   ├── strategic/
│   │   ├── tactical/
│   │   └── bot.ts
│   ├── renderer/src/
│   │   ├── renderer.ts
│   │   ├── camera.ts
│   │   ├── layers/
│   │   ├── selection/
│   │   ├── minimap/
│   │   ├── interpolation/
│   │   └── assets/
│   └── audio/src/
│       ├── audio-manager.ts
│       └── cues.ts
│
├── tools/
│   ├── simulator/src/
│   ├── replay/src/
│   ├── balance/src/
│   ├── fuzz/src/
│   └── benchmark/src/
│
├── tests/
│   ├── architecture/
│   ├── unit/
│   ├── integration/
│   ├── simulation/
│   ├── determinism/
│   ├── invariants/
│   ├── fuzz/
│   ├── e2e/
│   └── fixtures/
│
├── docs/
│   ├── adr/
│   ├── specs/          ← CAPABILITIES.md + SPEC-<module-id>.md
│   ├── tasks/
│   │   ├── plan.md
│   │   └── todo.md
│   └── [technical documents]
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json
├── vitest.config.ts
├── playwright.config.ts
├── biome.jsonc
├── .env.example
└── README.md
```

The plan/spec files will be materialized in a later execution, preserving this content and the approved decisions.

---

# 6. Dependency and build plan

## 6.1. Planned dependencies

| Area | Choice |
|---|---|
| Runtime | Node 24 |
| Package manager | pnpm `10.33.2` |
| TypeScript | Line 5.9, initially `5.9.3` |
| Web build | Vite 7 |
| UI | React 19 |
| Renderer | PixiJS `8.20.1`, candidate |
| Camera | pixi-viewport `6.0.3`, candidate |
| Server WebSocket | `ws` 8 |
| External schemas | Zod 4 |
| Server logging | Pino |
| Portable hash | SHA-256 from `@noble/hashes` |
| Tests | Vitest 4 |
| Properties/fuzz | fast-check 4 |
| Browser/E2E | Playwright |
| Lint | Biome |
| Tool TS execution | tsx |
| Initial audio | Web Audio through a small custom adapter |

Except for the versions already specified, the bootstrap will select a compatible patch within the indicated line, verify `engines` and peers, and save exact versions.

Do not install `latest` indiscriminately.

## 6.2. Build strategy

- ESM.
- `tsc` for portable packages, server, and tools.
- Vite for the web application.
- Topological build across the workspace.
- No Nx/Turborepo initially.
- Production server runs compiled JavaScript.
- `tsx` is restricted to development and tools.
- One lockfile: `pnpm-lock.yaml`.

TypeScript configuration:

- `strict`.
- `noUncheckedIndexedAccess`.
- `exactOptionalPropertyTypes`.
- Explicit types in public APIs.
- No `any` in application code.
- `unknown` at external boundaries.

---

# 7. Central contracts

The following excerpts are **design contracts**, not implementation.

## 7.1. Identifiers and versions

```ts
type PlayerId = 0 | 1 | 2 | 3
type EntityId = number
type Tick = number
type Fixed = number

interface RulesIdentity {
  readonly simulationVersion: string
  readonly rulesetVersion: string
  readonly rulesetHash: string
  readonly mapId: string
  readonly mapHash: string
}
```

All numeric values are validated as integers within the permitted limits.

## 7.2. Engine

```ts
interface Simulation {
  step(commands: readonly ScheduledCommand[]): TickResult
  observe(playerId: PlayerId): PlayerObservation
  exportSnapshot(): SimulationSnapshot
  hashState(): string
}
```

Rules:

- `step` is synchronous.
- No `await` during a tick.
- `step` is the only path that modifies gameplay.
- Observations and snapshots do not share mutable buffers with the internal state.
- Systems and ECS are not accessible through the public object.
- Creating/restoring a simulation are operations separate from advancing ticks.

## 7.3. State

```ts
interface GameState {
  tick: Tick
  phase: 'RUNNING' | 'FINISHED'
  identity: RulesIdentity
  seed: number
  rng: RngState
  nextEntityId: EntityId
  players: PlayerState[]
  world: EcsState
  map: DynamicMapState
  navigation: NavigationState
  vision: VisionState
  victory: VictoryState
}
```

Responsibilities:

- Components hold queues, orders, cooldowns, and effects.
- `players` holds resources, research, and the participant's situation.
- `map` holds dynamic modifications.
- `navigation` holds pending work that influences future ticks.
- Immutable static data is identified by hash.
- Profiling statistics, connections, and logs do not belong to GameState.

## 7.4. Agent

```ts
interface AgentInput {
  readonly observation: PlayerObservation
  readonly memory: AgentMemory
}

interface AgentDecision {
  readonly commands: readonly CommandIntent[]
  readonly nextMemory: AgentMemory
}
```

The bot is a deterministic transformation of observation + memory.

Its decision state belongs to the agent runner, not to the world. The replay records the produced commands and does not depend on re-running the AI to reproduce the match.

## 7.5. Renderer

```ts
interface GameRenderer {
  mount(host: HTMLElement, callbacks: RendererCallbacks): Promise<void>
  present(frame: RenderFrame): void
  resize(width: number, height: number): void
  dispose(): void
}
```

`RenderFrame` contains data derived from an allowed view. It does not contain internal components or references to GameState.

---

# 8. Determinism and ECS

## 8.1. Arithmetic

Initial choice:

```text
1 tile = 256 position units
```

Rules:

- Positions and distances in fixed point.
- HP, armor, resources, and supply as integers.
- Costs and percentages use integers.
- Percentages in basis points: `10_000 = 100%`.
- Cooldowns and durations are tick counters.
- Author-authored data in seconds is compiled to ticks.
- Speed accumulates an integer remainder to avoid losing displacement to rounding.
- Distance uses squares and integer square root when necessary.
- No platform-dependent trigonometry in gameplay decisions.
- Numeric limits must prove that intermediates remain below `Number.MAX_SAFE_INTEGER`.

Forbidden in the core:

- `Math.random`.
- `Date`.
- `performance.now`.
- Timers.
- I/O.
- Locale dependency.
- Sorting without an explicit tie-break.
- Asynchronous results influencing the tick.

## 8.2. RNG

Algorithm: **xoshiro128\*\*** with four `uint32` words.

- Documented initialization covered by known vectors.
- All-zero state not allowed.
- 32-bit multiplications use explicit semantics, such as `Math.imul`.
- The simulation has its own stream.
- Each bot has its own stream derived from the seed and the slot.
- Visual randomness has an independent stream.
- No random consumption by rendering alters the world.

The initial content will not have random critical hits or random evasion.

## 8.3. Entity IDs

- Monotonic IDs.
- Start at `1`.
- Never recycled.
- Overflow causes an explicit technical error.
- ID allocation happens only after successful validation.

Internal storage slots may be recycled; entity IDs may not.

## 8.4. ECS

Choice:

- Dense stores for hot components: position, health, owner, basic movement.
- Sparse stores for orders, production, research, and construction.
- Mapping `EntityId → slot`.
- Logical list of entities in ID order.
- Queries that affect gameplay always return stable order.
- Components have no behavior methods.

Storage indices are not gameplay identity.

A restore may reorganize internal slots without changing the result. This must have a specific test.

## 8.5. Authorized mutability

The approved exception covers the private state controlled by the simulation execution, including the deterministic navigation work it owns.

Externally:

- Commands are immutable.
- Observations are independent copies.
- Snapshots are independent.
- The rules catalog is read-only.
- The bot, renderer, and transport do not receive write references.

---

# 9. Tick semantics and system order

## 9.1. Temporal convention

```text
State(t) = state after completing tick t

step(State(t), Commands(t + 1))
→ State(t + 1)
```

Entities created during `t + 1` can only act starting from `t + 2`.

## 9.2. Initially frozen order

1. Expire temporary effects.
2. Validate and apply scheduled commands.
3. Update orders and request navigation.
4. Execute the pathfinding budget.
5. Resolve movement and collision.
6. Gather, deposit, and repair.
7. Advance construction.
8. Advance research.
9. Update supply and advance production.
10. Update vision for target acquisition.
11. Select attacks and create damage/projectile events.
12. Advance pre-existing projectiles.
13. Apply accumulated damage.
14. Resolve deaths and clean up references.
15. Recalculate supply after deaths.
16. Update final vision and player memory.
17. Evaluate defeat, victory, and duration limit.
18. Check invariants per mode.
19. Produce events and, when configured, the hash.

Intentional consequences:

- A completed research can affect combat in the same tick.
- Completed production creates a unit that does not attack in that tick.
- Two combatants can kill each other in the same tick.
- Projectiles created now do not advance immediately.
- Damage is accumulated before resolving deaths.
- All eliminations in the tick are considered before deciding the winner.

Changing this order requires an ADR and a new simulation version.

---

# 10. Commands and validation

## 10.1. Player commands

| Command | Essential payload | Semantics |
|---|---|---|
| `MOVE` | entities, point, mode | Movement |
| `ATTACK` | entities, visible target, mode | Directed attack |
| `ATTACK_MOVE` | entities, point, mode | Advance acquiring enemies |
| `STOP` | entities | Clear orders and stop movement |
| `HOLD` | entities | Do not chase; attack in range |
| `PATROL` | entities, two points, mode | Alternate between points |
| `GATHER` | workers, resource, mode | Gather and deposit repeatedly |
| `RETURN_CARGO` | workers | Deposit current cargo |
| `BUILD` | worker, definition, tile | Reserve cost and foundation |
| `TRAIN` | producer, unit | Queue production |
| `RESEARCH` | laboratory, research | Start research |
| `RALLY` | producer, point or known resource | Rally point |
| `REPAIR` | workers, target, mode | Repair allowed target |
| `CANCEL_CONSTRUCTION` | foundation | Cancel and refund part of the cost |
| `CANCEL_PRODUCTION` | producer, queue item | Cancel item |
| `CANCEL_RESEARCH` | laboratory | Cancel research |
| `USE_ABILITY` | unit, ability, target | Trigger ability |
| `SURRENDER` | no payload | Give up |

`SCOUT` will be a client/bot intent translated into `MOVE` or `PATROL`. It does not need a special system.

Queue mode:

```text
replace | append
```

Only compatible orders accept `append`. Construction and purchases do not use the movement queue.

## 10.2. Canonical envelope

```ts
interface ScheduledCommand {
  readonly tick: Tick
  readonly playerId: PlayerId
  readonly sequence: number
  readonly intent: CommandIntent
}
```

The client protocol sends intent and sequence. The server determines identity and execution tick.

Ordering:

```text
tick → emitter category → playerId → sequence
```

Internal administrative commands, such as abandonment on disconnect, have a `SYSTEM` emitter and a separate format. Clients cannot issue them.

## 10.3. Atomicity

For each command:

1. Validate format.
2. Validate context.
3. Prepare the change without writing.
4. Apply in full.

If invalid:

- Do not deduct resources.
- Do not consume RNG.
- Do not allocate an ID.
- Do not modify the queue.
- Do not reserve navigation.
- Do not change the hash.

**Important:** a tick containing an invalid command may still advance economy and combat normally. The no-mutation test compares the application of the isolated command, or compares two equivalent executions with and without that command.

## 10.4. Multiple selections

- Duplicate IDs are invalid.
- Initial limit: 256 entities per command.
- If a selected entity is nonexistent, dead, foreign, or incompatible, reject the entire command.
- The client filters incompatible units before sending.
- The server continues to validate everything.

## 10.5. Error codes

Examples:

```text
INVALID_PAYLOAD
NOT_ROOM_MEMBER
INVALID_PHASE
NOT_OWNER
ENTITY_UNAVAILABLE
TARGET_UNAVAILABLE
INSUFFICIENT_RESOURCES
SUPPLY_BLOCKED
QUEUE_FULL
TECH_REQUIREMENT
INVALID_PLACEMENT
ORDER_NOT_SUPPORTED
RATE_LIMITED
```

For enemy targets, do not publicly distinguish "exists but is hidden" from "does not exist".

---

# 11. Closed gameplay rules

The numbers below are **implementation and test baselines**, not a claim of competitive balance.

## 11.1. Initial state

Each participant starts with:

- One completed Base.
- Eight workers.
- `400 Mineral`.
- `0 Energy`.
- Initial supply `8/15`.
- No research.
- Faction and starting point defined in the configuration.

## 11.2. Resources

| Property | Mineral | Energy |
|---|---:|---:|
| Cargo per trip | 10 | 5 |
| Collection time | 1 s | 2 s |
| Initial amount per node | 3,000 | 6,000 |

Rules:

- Resources only enter the wallet when deposited.
- Deposit at any completed own Base.
- One entity gathers from a node at a time; contention is resolved by deterministic order.
- A dead worker loses its cargo.
- An exhausted node does not produce negative resources.
- Without an accessible deposit point, the worker keeps its cargo and enters an explicit waiting state.
- Energy is gathered directly; there will be no extractor in the MVP.

## 11.3. Construction

- Cost deducted when accepting `BUILD`.
- The foundation immediately reserves the footprint.
- The entire area must be visible and valid.
- The foundation starts with 10% of max HP.
- Progress requires a worker in range.
- One active builder per foundation.
- Another worker may take over if the previous one dies or leaves.
- No acceleration from multiple workers in the MVP.
- A paused construction remains a foundation.
- No global rule against wall-offs is imposed; blockades may be player decisions.

Cancellation:

```text
refund = floor(cost × remainingProgress × 75%)
```

Applied per resource, with integer arithmetic and an explicit denominator.

Destruction does not refund cost.

## 11.4. Production and supply

- Max queue: five items per producer.
- Cost and supply reserved on acceptance.
- One active item per producer.
- A destroyed producer loses its queue and frees supply reservations.
- A canceled, not-yet-started item: full refund.
- A canceled active item: proportional refund of 75% of the remaining portion.
- On completion, the supply reservation becomes used supply.
- A blocked exit keeps the unit as "completed waiting for space".
- Do not create overlap to force a spawn.

Supply:

```text
max cap = 200
cap = min(200, sum of operational sources)
```

It is valid to remain above the cap after losing Supply buildings.

In that case:

- Do not accept new production.
- Pause production progress while `used + reserved > cap`.
- Do not destroy existing units.

## 11.5. Repair

- The worker repairs buildings and units with the `mechanical` tag.
- Every `0.5 s`: up to 5 HP per 1 Mineral.
- The last partial repair also costs 1 Mineral.
- Without resources: stop, no free HP.
- Initial limit: one active repairer per target.
- A dead target cannot be repaired.

## 11.6. Victory

A participant loses when:

- It is left with no completed own Base.
- It surrenders.
- It receives an administrative abandonment after the reconnection window.

An incomplete Base foundation does not prevent defeat.

After being defeated:

- Its remaining entities become inactive.
- They do not receive new orders.
- They do not keep the match alive.

Result:

- One surviving participant: victory.
- No survivors in the same tick: draw.
- Limit of `45 minutes` simulated: draw by duration.
- Technical execution failure: match aborted, with no invented winner.

The limit is part of the rules and the replay.

---

# 12. Combat and abilities

## 12.1. Damage

Initial formula:

```text
modifiedDamage = floor(baseDamage × targetModifierBP / 10_000)

effectiveDamage = max(1, modifiedDamage - effectiveArmor)

newHP = max(0, oldHP - accumulatedDamage)
```

- No negative damage.
- No friendly fire in the MVP.
- Attack upgrades enter the damage captured when firing.
- Armor is consulted on impact.
- The cooldown starts when the attack is issued.
- No wind-up in the first version.

## 12.2. Target selection

Priority:

1. Valid explicit target.
2. Combatant enemy in range.
3. Worker in range.
4. Building in range.

Tie-breaks:

```text
priority → squared distance → EntityId
```

Do not scan all entities for each attacker. Query the spatial index.

## 12.3. Pursuit

- `ATTACK`: pursue the target while visible and valid.
- On losing sight, go to the last known position; then return to normal acquisition.
- Do not query the current position of a hidden target to plan pursuit.
- `ATTACK_MOVE`: pursue at most six tiles from the acquisition point; then resume the route.
- `HOLD`: never pursue.
- `STOP`: cancels the order but allows automatic attacks in range.

## 12.4. Projectiles

- Single-target projectiles are homing.
- Their full target and trajectory remain private on the server.
- The client receives only the observable segment.
- If the target dies, the projectile continues to the last position and expires without direct damage.
- An area projectile may detonate at that last position.
- TTL prevents eternal projectiles.
- Terrain does not intercept projectiles in the MVP.
- Distance + vision determine whether a shot is possible.

## 12.5. AoE

- Center of impact.
- 100% of the damage in the inner radius of 0.5 tile.
- 50% in the rest of the radius.
- Enemies only.
- Each entity receives one impact per explosion.
- Spatial query, followed by exact distance.

## 12.6. Abilities

Contract:

```text
id
cost
cooldownTicks
range
targetKind
effects[]
durationTicks
requirements
```

Effects used initially:

- Temporary armor modification.
- Temporary speed modification.

M2 content:

- **Brace:** Guardian/Titan, +3 armor for 5 s, cooldown 12 s, cost 5 Energy.
- **Overclock:** Drone/Pulse/Phantom, +25% speed for 5 s, cooldown 12 s, cost 5 Energy.

No stacks of the same effect. A valid reapplication renews the duration.

Expiration occurs before the commands of the corresponding tick.

---

# 13. Initial unit data

Conventions:

- `M/E`: Mineral/Energy.
- `CD`: attack interval in seconds.
- `Vel`: tiles/s.
- `Alc`: range in tiles.
- `Proj`: projectile speed in tiles/s; `—` means an instant attack.
- All attack ground units and buildings.
- There are no air units, invisibility, or teleport in the MVP.
- A worker consumes 1 supply.

## 13.1. Vanguard

| Unit | HP/Armor | Damage/CD | Range/Proj | Speed/Vision | M/E | Time | Supply | Producer |
|---|---|---|---|---|---|---:|---|
| Worker | 60/0 | 4/1 | 1/— | 3/7 | 50/0 | 12 s | 1 | Base |
| Soldier | 90/1 | 12/0.75 | 1/— | 3/7 | 75/0 | 16 s | 1 | Barracks |
| Ranger | 70/0 | 14/1 | 5/16 | 3/9 | 90/20 | 20 s | 2 | Barracks |
| Guardian | 180/3 | 9/1 | 1/— | 2.25/7 | 125/30 | 25 s | 3 | Barracks + Tech |
| Hunter | 90/1 | 22/1 | 6/20 | 3/9 | 120/50 | 25 s | 2 | Factory |
| Siege | 150/1 | 45/2 | 9/12 | 1.5/10 | 180/80 | 35 s | 4 | Factory + Tech |
| Raider | 70/0 | 10/0.5 | 1/— | 4.5/9 | 100/30 | 20 s | 2 | Factory |
| Titan | 450/5 | 40/1.5 | 2/— | 1.5/8 | 350/200 | 60 s | 8 | Factory + Late Game |

Roles:

- Soldier: frontline.
- Ranger: ranged damage.
- Guardian: damage absorption.
- Hunter: +25% damage against the `armored` tag.
- Siege: two-tile AoE.
- Raider: mobility and economic pressure.
- Titan: heavy closing unit.

## 13.2. Nexus

| Unit | HP/Armor | Damage/CD | Range/Proj | Speed/Vision | M/E | Time | Supply | Producer |
|---|---|---|---|---|---|---|---|---|
| Worker | 45/0 | 4/1 | 1/— | 3/7 | 45/0 | 11 s | 1 | Base |
| Drone | 55/0 | 10/0.5 | 1/— | 3.5/7 | 60/0 | 13 s | 1 | Barracks |
| Pulse | 60/0 | 16/0.75 | 5/20 | 3.25/9 | 80/25 | 18 s | 2 | Barracks |
| Sentinel | 100/2 | 8/0.75 | 4/16 | 2.75/8 | 100/40 | 22 s | 2 | Barracks + Tech |
| Disruptor | 70/0 | 12/1.5 | 6/12 | 3/9 | 110/70 | 25 s | 3 | Factory |
| Artillery | 110/0 | 38/2 | 9/12 | 1.5/10 | 160/100 | 32 s | 4 | Factory + Tech |
| Phantom | 65/0 | 24/1 | 4/20 | 4.5/10 | 130/60 | 24 s | 3 | Factory |
| Colossus | 330/3 | 32/1.25 | 6/16 | 2/9 | 300/220 | 55 s | 8 | Factory + Late Game |

AoE:

- Disruptor: 1.5 tile.
- Artillery: two tiles.
- Colossus: 1.5 tile.

The `armored`, `mechanical`, `ranged`, and `heavy` tags are declarative and validated.

The differences above are starting points for self-play and analysis; they must not be silently altered by the executor to "seem more fun".

---

# 14. Buildings, research, and map

## 14.1. Buildings

| Building | Footprint | HP Vanguard/Nexus | Cost Vanguard | Cost Nexus | Time | Function |
|---|---:|---|---|---|---|---|
| Base | 4×4 | 1600/1300 | 450M | 350M | 60 s | Workers, deposit point, 15 supply |
| Supply | 2×2 | 400/300 | 100M | 90M | 20 s | +8 supply |
| Barracks | 3×3 | 900/700 | 150M | 130M | 35 s | Initial units |
| Factory | 3×3 | 1100/850 | 200M/100E | 180M/100E | 45 s | Advanced units |
| Tech Lab | 3×3 | 600/450 | 150M/75E | 120M/75E | 35 s | Research |
| Defense | 2×2 | 650/450 | 125M/25E | 110M/35E | 25 s | Static defense |

`Expansion` is an additional Base, without duplicating the definition logic.

Defense:

- Vanguard: damage 18, interval 1 s, range 6.
- Nexus: damage 14, interval 0.75 s, range 6.
- Projectile at 16 tiles/s.
- Vision eight tiles.

Prerequisites:

```text
Base → Barracks
Barracks → Tech Lab
Barracks + Tech Lab → Factory
Barracks → Defense
```

## 14.2. Research

All are single-level in the MVP.

| Research | Cost/Time | Vanguard | Nexus |
|---|---|---|---|
| Attack | 100M/50E, 30 s | +2 military damage | +2 military damage |
| Defense | 100M/50E, 30 s | +1 military armor | +1 military armor |
| Economy | 125M/50E, 35 s | Mineral cargo 10→12 | Energy collection 2 s→1.5 s |
| Movement | 100M/75E, 35 s | +10% military speed | +10% military speed |
| Faction Mechanic | 150M/100E, 45 s | Unlocks Brace | Unlocks Overclock |
| Late Game | 250M/200E, 60 s | Unlocks Titan | Unlocks Colossus |

Late Game requires Factory and Faction Mechanic.

Upgrades:

- They apply to existing and future entities.
- They never alter the original static definition.
- Modifiers follow a fixed order.
- Cooldown time is rounded up, minimum one tick.
- The same upgrade cannot be researched in two laboratories simultaneously.

## 14.3. Competitive map

Candidate dimension: `192 × 192`.

Initial authored layout, symmetric by 180° rotation:

- Base A: center at `(24, 96)`.
- Base B: center at `(168, 96)`.
- Expansion A: center at `(40, 40)`.
- Expansion B: center at `(152, 152)`.
- Contestable central band between `x = 72` and `x = 119`.
- Left barrier: tiles `x = 64…71`.
- Right barrier: tiles `x = 120…127`.
- Each barrier has a passage at `y = 90…101`.
- Map edges are impassable.
- Additional obstacles must be mirrored.
- Eight Mineral nodes and two Energy per starting base.
- Six Mineral nodes and two Energy per expansion.
- Two Mineral nodes in the center.

The final file will contain explicit coordinates for all special tiles, resources, and spawns.

Tests:

- Both spawns valid.
- Workers not overlapping.
- Bases and resources accessible.
- Strategic distances symmetric.
- Exactly two passages between the main regions.
- No invalid initial footprint.

The four-player technical map will be a separate fixture, without commercial content status.

---

# 15. Navigation and collision

## 15.1. Grid and A*

- One navigation tile per map tile initially.
- Eight neighbors.
- Integer costs: orthogonal `1024`, diagonal `1448`.
- Octile heuristic.
- Corner cutting forbidden.
- Tie-break: `f → h → tile index`.
- Building footprints update navigability.
- Mobile units are local obstacles, not global grid rebuilds.

## 15.2. Deterministic budget

Initial configuration:

- Up to four active searches.
- Total budget of 4,096 expansions per tick.
- Slices of 256 expansions in round-robin.
- Stable request queue.
- Priority and progress are part of the state.
- No millisecond-based budget.

A paused search must be serializable and restorable.

The budget may change after benchmark, but it is part of the versioned rules because it changes when paths become available.

## 15.3. Group movement

In the first algorithm:

1. Sort units by ID.
2. Generate formation destinations around the click in a deterministic spiral.
3. Select navigable and distinct positions.
4. Request paths by order, not by frame.
5. Keep the order while the search is pending.
6. Replan only on invalidation or persistent blockage.

Do not implement flow fields or rigid formation initially.

The spike may justify route sharing; the change requires measurement and an ADR, not preventive addition.

## 15.4. Local collision

- Units have a logical radius between 0.25 and 0.45 tile.
- Building shapes are rectangular footprints.
- The movement test considers the traversed segment, not just the final point.
- Use the spatial index.
- Avoidance attempts follow a fixed sequence.
- Persistent blockage increments a counter in the state.
- Priority among blocked units must be deterministic and avoid always favoring the lowest ID.
- Resolution order may rotate by position in the ID list each tick.

Limits:

- Do not cross a wall.
- Do not teleport out of collision.
- Do not overlap units to "resolve" a choke.
- Do not recompute A* every frame.

## 15.5. Unreachable targets

- Explicit result: `PENDING`, `FOUND`, `UNREACHABLE`, or `INVALIDATED`.
- A blocked destination may be adjusted to the nearest valid tile by an ordered search.
- If no valid destination exists, end the order with a failure event.
- A path not found is not a crash.
- "Unit stopped" is not automatically a bug: distinguish an impossible order from a progress failure.

---

# 16. Fog of war and observations

## 16.1. Representation

Per player:

- Bitset of visible tiles.
- Bitset of explored tiles.
- Memory of observed buildings and resources.

In the MVP:

- Circular vision in tiles.
- No elevation.
- Obstacles block movement but not the vision circle.
- Static terrain and map layout are public.
- Dynamic occupancy, remaining resources, and enemy entities are private per vision.

## 16.2. Allowed observation

Contains:

- Tick.
- Public match state.
- Own wallet, supply, and research.
- Own entities.
- Currently visible enemies.
- Enemy buildings previously seen, with `lastSeenTick`.
- Seen resources and their last known information.
- Fog.
- Allowed events.

Does not contain:

- Enemy wallet.
- Enemy queues.
- Hidden enemy research.
- Current positions of hidden entities.
- Dynamic global navigation.
- RNG.
- Bot internal state.
- Global match hash.

## 16.3. Memory and removal

- Enemy units disappear when leaving vision.
- Buildings may remain as memory.
- Destruction outside vision does not update that memory.
- When revisiting the empty footprint, remove the memory.
- No invisible death event may update the minimap or the public command log.
- Damage received from a hidden source may update own HP without revealing the attacking entity.

## 16.4. No-leak test

Create two worlds that differ only in hidden information.

For the same player:

```text
observation(worldA) === observation(worldB)
```

This test covers:

- DTO.
- Events.
- Deltas.
- View hash.
- Relevant error messages.
- Structure memory.

It is a critical gate.

---

# 17. AI and self-play

## 17.1. Initial frequency

In the 20 ticks/s configuration:

| Layer | Normal | Easy |
|---|---:|---:|
| Strategic | Every 20 ticks | Every 40 ticks |
| Tactical | Every 4 ticks | Every 10 ticks |

Difficulty modifies decision-making, not free resources or vision.

## 17.2. Initial strategy

Normal order:

1. Distribute the eight workers among minerals.
2. Produce workers up to 16.
3. Build Supply before the cap.
4. Build Barracks.
5. Assign two workers to Energy once there are Barracks.
6. Produce the initial composition.
7. Build Tech Lab.
8. Research Economy and Attack as budget allows.
9. Send an attack with at least eight military units.
10. Expand with a sustainable economy.
11. In M2, add Factory and advanced technology.

Guards:

- Do not repeat a command already in execution.
- Keep a reserve for Supply and worker replacement.
- Reassign idle workers.
- Handle exhausted resources.
- Cancel persistently unfeasible objectives.
- Record the wait reason in debug mode.

## 17.3. Tactics

- Scouting using the public map and memory.
- Target priority shared with the allowed observation.
- Focus fire.
- Retreat below 25% HP when there is a known safe path.
- Regroup after losing 40% of the attack group.
- Use unlocked abilities when useful.
- Do not chase hidden coordinates.

## 17.4. Agent slots

- `BOT`: built-in implementation.
- `AGENT`: adapter that receives observations and returns commands.
- M2 includes an example external agent using authorized transport.
- Internal plugins are trusted development code; they do not constitute an arbitrary-code sandbox.

## 17.5. Self-play

Record:

- Seed.
- Factions.
- Strategies.
- Difficulties.
- Commands.
- Result.
- Duration.
- Reasons for timeout or inactivity.

A bot that only produces draws by timeout does not pass as "functional AI".

Initial gate:

- At least 95% of 100 matches of the normal scenario end by elimination before the limit.
- Any crash, invariant violation, or divergence blocks.
- A legitimate timeout is reported separately.

---

# 18. Server, rooms, and protocol

## 18.1. Room lifecycle

```text
CREATED → WAITING → READY → STARTING → RUNNING → FINISHED → CLOSED
```

Additional transitions:

- Configuration/readiness change: `READY → WAITING`.
- Recoverable initialization failure: `STARTING → WAITING`.
- Room expiration without a game: `WAITING/READY → CLOSED`.
- Technical failure during a game: aborted result, then `FINISHED`.

`READY` requires:

- Two or more active participants.
- A count compatible with the map.
- Humans ready.
- Valid bots/agents.
- Valid factions and rules version.

The creator automatically enters slot 0.

## 18.2. Four slots

Each slot:

```text
slotId
kind: HUMAN | AGENT | BOT | EMPTY
participantId
faction
ready
connectionStatus
```

M1:

- Four-slot structure.
- Only two can be active on the initial map.

M2:

- Session validated with four participants in a fixture.
- No "player 0 vs player 1" hardcodes in the simulation.

## 18.3. Messages

Envelope:

```text
protocolVersion
type
requestId, when applicable
payload
```

Planned messages:

```text
Hello
CreateRoom
JoinRoom
LeaveRoom
ConfigureSlot
SetReady
RoomState
StartGame
Command
CommandAck
CommandRejected
StateSnapshot
StateDelta
SnapshotRequest
MatchFinished
Reconnect
Ping
Pong
Error
```

## 18.4. Scheduling

Initial configuration:

```text
command.tick = currentCompletedTick + 1
```

- The server assigns `playerId`.
- Sequence per participant is monotonic.
- Duplicates do not execute again.
- The tick reported by the client is only diagnostic.
- Commands are not applied retroactively.
- Re-validate gameplay at the execution tick.

Differences in arrival time may produce distinct canonical streams. The deterministic guarantee holds for the recorded canonical stream.

## 18.5. Replication

Baseline at 20 ticks/s:

- Delta every tick.
- Full snapshot every 40 ticks.
- Immediate snapshot on entry/reconnect/resync.
- Each message contains `viewTick`, `viewSequence`, and the view hash.
- The delta contains `baseSequence`.
- The client only applies a delta over the correct base.
- Divergence requests a snapshot.
- Do not try to patch an inconsistent replica indefinitely.

Deltas:

- Entities added.
- Entities removed from vision.
- Changes to public components.
- Compact position tuples.
- Fog changes.
- Own resources, supply, research, and queues.
- Allowed events.

Removal from vision does not need to reveal whether the reason was an invisible death.

## 18.6. Reconnection

- Random opaque token per participant.
- Generated with server cryptography, outside the simulation.
- Stored in the browser in `sessionStorage`.
- Sent over the WSS channel, never in a query string.
- Reconnection keeps slot, sequence, and ownership.
- A full snapshot replaces the old replica.
- Initial window: 60 seconds.
- The match continues during the disconnect.
- Expiration schedules an administrative abandonment command, recorded in the replay.

Without process persistence:

- A server restart interrupts matches.
- The client receives an error/expiration.
- Do not promise recovery after a process crash in the MVP.

## 18.7. Initial limits

- Client command: up to 32 KiB.
- 30 sustained commands/s, burst 60 per participant.
- Up to 256 entities per command.
- Orders per unit: max 32.
- Production: max five items per producer.
- Room creation and entry attempts limited per IP and participant.
- Configurable concurrent session limit.

Backpressure:

- Above 1 MiB pending: stop queueing new updates for that connection.
- On recovery: send a snapshot.
- Above 8 MiB or persistent ten-second delay: disconnect the slow client.
- Never block the tick waiting to send.

## 18.8. Minimum security

- Validate Origin on the WebSocket.
- Validate schemas and size before handling the payload.
- Bind identity to the transport, not the payload.
- No arbitrary state mutation endpoints.
- Tokens outside logs.
- Replay downloads restricted to participants.
- Full replay available only after the match ends.
- `.env.example` without secrets.

---

# 19. Replay, hashing, and tools

## 19.1. Canonical hash

Initial algorithm: portable SHA-256.

Canonical serialization:

- Schema with explicit order.
- Integers with a defined representation.
- UTF-8 strings with length.
- Entities ordered by ID.
- Components in schema order.
- Absence distinct from zero value.
- No `JSON.stringify(GameState)` as a canonical mechanism.
- No reliance on `Map` order or object keys.

Include:

- Tick and phase.
- Rules/map identity.
- RNG.
- Next ID.
- Players.
- Components.
- Orders and queues.
- Effects/cooldowns.
- Navigation progress.
- Dynamic map.
- Vision and memory.
- Victory.

Exclude:

- GPU.
- Connections.
- Real clock.
- Logs.
- Network buffers.
- Array capacity.
- Internal slot layout.
- Reconstructible indices that do not change decisions.

## 19.2. Replay format

Initial format: versioned JSON Lines.

Records:

```text
header
command
checkpoint
result
```

Header:

```text
replayVersion
simulationVersion
rulesetVersion
rulesetHash
mapId
mapHash
seed
initialSnapshot
ruleset/map needed for reproduction
participants
```

Checkpoint:

```text
tick
stateHash
optional snapshot
```

Result:

```text
finalTick
result
finalStateHash
```

Initial frequencies:

- Hash every 100 ticks.
- Seek snapshot every 1,200 ticks.
- Mandatory hash at the end.

The seek snapshot plus the subsequent commands must produce the same result as replaying from the start.

## 19.3. Compatibility

Separate:

- Protocol version.
- Replay version.
- Snapshot schema version.
- Simulation version.
- Content version/hash.

The MVP rejects incompatible versions with a precise message.

Do not silently run an old replay with new rules.

## 19.4. Divergence

The CLI reports:

- First divergent checkpoint.
- Expected/obtained hash.
- Last valid checkpoint.
- Nearby commands.
- Divergent components when snapshots are available.

To find the exact tick:

- Re-execute the interval from the last valid checkpoint.
- Use the per-tick hash trail of the reference execution, or run two available versions side by side.

**Without a per-tick reference, the hash of an isolated checkpoint only locates the interval, it does not prove the exact tick of divergence.**

The determinism tests will produce that per-tick reference.

## 19.5. Tools

Public commands:

```bash
npm run replay -- <file>
npm run replay -- <file> --validate
npm run replay -- <file> --inspect-tick 1000
npm run replay -- <file> --inspect-entity 42

npm run simulate -- --games 1000
npm run simulate -- --games 10000 --seed 123

npm run fuzz
npm run fuzz -- --seed 123 --runs 10000

npm run balance -- --games 1000 --seed 123
npm run benchmark -- --suite simulation
npm run benchmark -- --suite renderer
```

All are scripts to be created; they do not exist yet.

Headless output separates:

```text
Completed
Elimination wins
Draws
Timeouts
Aborted
Crashes
Invariant violations
Desyncs
Progress watchdog failures
```

Initial tool concurrency: two workers, configurable. Each worker runs isolated matches.

## 19.6. Failure artifact

Save:

```text
seed
rules/map identity
last completed tick
failing tick/system
commands
last valid checkpoint
hashes
error
replay
tool version
```

Failure during a tick:

- Stop the session.
- Do not publish the partially modified state.
- Replay from the last valid state.
- Do not keep using a possibly corrupted simulation.

---

# 20. Client, controls, and presentation

## 20.1. PixiJS loop

- `Application` with a private ticker.
- pixi-viewport updated by the same cycle.
- Avoid an implicit shared ticker.
- A single visual loop per instance.
- `dispose()` removes the ticker, listeners, and resources.
- React mounts the host and controls screens; it does not create a React tree per unit.

## 20.2. Layers

```text
terrain
resources
buildings
units
projectiles
effects
fog
selection
world-overlays
```

External HUD and menus remain in the DOM.

## 20.3. Interpolation

Baseline:

- Interpolate between allowed snapshots.
- Initial visual buffer of one replication interval: 50 ms at 20 Hz.
- Do not extrapolate gameplay.
- Click and selection feedback is immediate.
- Teleport, spawn, death, and visibility changes are not interpolated as ordinary movement.
- When losing synchronization, wait for a valid snapshot.

## 20.4. Controls

| Input | Action |
|---|---|
| Left click | Select |
| Left drag | Box selection |
| Shift + selection | Add/remove from selection |
| Double click | Select visible same-type on camera |
| Ctrl + number | Set group |
| Shift + number | Add selection to group |
| Number | Recall group |
| Double number | Center camera on group |
| Right click | Contextual action |
| A + click | Attack move |
| P + click | Patrol from current position |
| H | Hold |
| S | Stop |
| B | Build menu |
| Esc | Cancel current mode |
| Arrows / edge scrolling | Move camera |
| Middle button + drag | Pan |
| Wheel | Zoom |
| Minimap click | Move camera |
| Minimap right click | Order to position |

Contextual right click:

1. Worker + resource: `GATHER`.
2. Worker + damaged own repairable target: `REPAIR`.
3. Unit + visible enemy: `ATTACK`.
4. Selected producer: `RALLY`.
5. Terrain: `MOVE`.

Initial configuration:

- Double click: up to 300 ms.
- Zoom: `0.5×` to `2×`.
- Edge scrolling: 12-pixel band.
- Camera inertia disabled initially.
- No hotkey fires while a text field is focused.
- Focus loss clears pressed keys.

## 20.5. Doodle — superseded

**Superseded by user decision (2026-09-17): the doodle identity is no longer the
direction.** The visual layer uses a real RTS sprite/tileset pack (Tiny Swords),
adopted **only after its license is validated** (golden rule: no public use
without a license that permits it; otherwise the pack is rejected). See
ADR-015 and `docs/assets/capabilities.md`.

The goals below that are identity-neutral remain valid (legibility, factions,
cheap rendering, no per-frame path redraws):

- Simple sprite atlas.
- Outlines and colors distinguish factions.
- Silhouettes distinguish roles.
- Discreet effects.
- Do not redraw complex paths for all units every frame.
- Stroke randomness is visual and independent (only relevant if hand-drawn assets return).

## 20.6. Accessibility

- Menus and room navigable by keyboard.
- Visible focus.
- Adequate contrast.
- Color is not the only faction indicator.
- Documented hotkeys.
- Option to reduce effects.
- Volume and mute.
- Comprehensible error messages.

Full screen-reader accessibility of combat is not an implicit MVP criterion; the DOM flows must be accessible and tested.

---

# 21. Spikes and performance criteria

No number below is a measured result. They are **initial acceptance targets**.

## 21.1. Spike A — Portability and determinism

Run the same fixture on:

- Node.
- Chromium.
- Firefox.
- WebKit via Playwright, when supported by the runner.

Scenario:

- 100 seeds.
- 2,000 ticks per seed.
- Movement, creation, removal, and invalid commands.
- Hash compared on all ticks.

Acceptance:

- Zero divergences.
- Equivalent snapshot/restore.
- No prohibited dependencies.
- Storage order perturbed without changing the result.

## 21.2. Spike B — Tick rate

Compare:

```text
20 ticks/s
30 ticks/s
60 ticks/s
```

Use scenarios equivalent in simulated time, not just the same number of ticks.

Measure:

- Average/p95/p99 duration.
- CPU per simulated second.
- Command latency.
- Cooldown/movement stability.
- Vision cost.
- Observation and serialization cost.

Selection rule:

1. Keep 20 if it meets the gates.
2. Consider 30 only if there is demonstrable responsiveness gain with sufficient budget.
3. Use 60 only with evidence of need.
4. If no candidate meets the gates, investigate hotspots before changing language or architecture.

Freeze the decision in an ADR.

## 21.3. Spike C — Renderer

Matrix:

```text
100
500
1,000
2,000
5,000
10,000 visual entities
```

Measure separately:

- Static sprites.
- Moving sprites.
- Animations.
- Fog.
- Selection.
- Minimap.
- Projectiles/effects.

Also test:

- Resize.
- DPR.
- Context loss/restoration.
- Enter/leave matches repeatedly.
- Pan versus box selection.
- Wheel versus page scroll.

## 21.4. Release targets

| Measure | Initial target |
|---|---|
| Simulation, 500 active entities | Tick p95 ≤ 10 ms |
| Simulation, 1,000 active entities | Tick p95 ≤ 20 ms; p99 < 40 ms |
| Renderer, 1,000 visible entities | Frame p95 ≤ 20 ms on reference hardware |
| Input feedback | p95 ≤ 32 ms |
| Visible authoritative movement | p95 ≤ 200 ms with RTT 50 ms and 10 ms jitter |
| Incremental memory per 1,000-entity match | ≤ 128 MiB on the server |
| Network, mobile 500-entity fixture | Target ≤ 256 KiB/s per client after bootstrap |
| Network, mobile 1,000-entity fixture | Target ≤ 1 MiB/s per client |
| Correctness at 10,000 entities | No crash/broken invariant in the defined scenarios |

Measurements of 2,000–10,000 entities are mandatory, but **10,000 entities at 60 FPS is not a release promise**.

### Measured baseline — 2026-09-16 (Phase 0 spike)

Hardware: AMD Ryzen 5 2600 (12 threads), WSL2 linux, Node v24.15.0. `pnpm run
benchmark`, seed 12345, 200 steps, MOVE of 256 units per step:

| Entities | Step avg | Step p95 | Step p99 | CPU at 20 t/s | CPU at 60 t/s | Hash/call |
|---|---|---|---|---|---|---|
| 1,000 | 0.030 ms | 0.057 ms | 0.175 ms | 0.6% | 1.8% | 0.66 ms |
| 10,000 | 0.029 ms | 0.041 ms | 0.064 ms | 0.6% | 1.7% | 7.5 ms |

Renderer (headless Chromium/SwiftShader, informational only — not a real-GPU
gate): frame avg ~17–26 ms at 1,000–5,000 presented units.

Cross-runtime determinism (Node ≡ Chromium): 5 seeds × 400 ticks, per-tick
hashes identical. Tick rate frozen at **20 t/s** (ADR-009). These numbers will
change as Phase 1–3 systems add per-tick work; re-run the harness to re-baseline.

## 21.5. Methodology

Each result records:

- Commit.
- Versions.
- Seed.
- Scenario.
- Number of active entities.
- Hardware.
- System.
- Browser/graphics backend.
- Warm-up.
- Samples.
- Average, p50, p95, p99, and max.
- Memory and GC when available.

Compare regressions on the same machine/runner class.

A regression above 20% requires investigation. Do not block on isolated variation of a shared runner without controlled repetition.

---

# 22. Testing and CI strategy

## 22.1. Matrix by behavior

| Area | Mandatory proofs |
|---|---|
| RNG | Known vectors, seed, export/restore |
| IDs | Uniqueness, monotonicity, rejection without consumption |
| Commands | Ownership, atomicity, deduplication, fog |
| Economy | Conservation, exhaustion, cargo, deposit |
| Construction | Footprint, pause, death, resume, cancellation |
| Production | Cost, supply, queue, blocked spawn |
| Research | Prerequisites, duplication, existing/future effects |
| Movement | Range, walls, collisions, stopping |
| Pathfinding | Optimal in small fixtures, unreachable, resume |
| Combat | Armor, range, cooldown, simultaneous damage |
| Projectiles | Impact, dead target, TTL, AoE |
| Fog | Visibility, memory, absence of leaks |
| AI | Limited observation, reproducible decisions, progress |
| Room | Lifecycle, readiness, slots, host and entry |
| Network | Schemas, sequence, reconnection, backpressure |
| Replay | Reproduction, seek, versions, divergence |
| Renderer | Lifecycle, camera, selection, coordinates |
| E2E | Real match to result |

## 22.2. Global invariants

- HP between zero and max.
- Wallets non-negative.
- Unique IDs.
- An ownable entity has exactly one valid owner.
- Neutral resources are not treated as player units.
- Dead entities do not act.
- Required components present.
- Entities within bounds.
- Footprints not illegally overlapping.
- Used and reserved supply non-negative.
- Reservations correspond to existing queues.
- Research exclusive per player.
- Positions/cooldowns/counters are valid integers.
- Dead references are cleaned up or explicitly handled.
- Result consistent with surviving players.
- Snapshot restores without semantic change.

Do not use the incorrect invariant `usedSupply <= cap` after Supply destruction.

## 22.3. Fuzz and properties

Generate:

- Valid and invalid commands.
- Partially invalid selections.
- Queue limits.
- Edge positions.
- Buildings in corridors.
- Cancellation on the completion tick.
- Death on the production tick.
- Vision changes on the attack tick.
- Disconnect/reconnect and duplicates.
- Different seeds and factions.

On failure:

1. Save the original case.
2. Minimize with fast-check.
3. Re-run the reduced case.
4. Create a permanent regression.
5. Preserve the original replay.

## 22.4. E2E

Two main flows:

**Product flow**

```text
open → create room → configure bot → start
→ select → move → gather → build
→ train → research → attack → win
```

**Transport flow**

```text
client A creates → client B joins → readiness
→ start → authorized commands
→ disconnect → reconnect → receive snapshot
```

E2E uses the real server and simulation.

Fast fixtures may reduce distances and times via an identified test ruleset. They must not provide an endpoint that simply forces a victory.

Also run at least one smoke with the production map and ruleset.

## 22.5. Planned quality scripts

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run test:unit
pnpm run test:integration
pnpm run test:simulation
pnpm run test:determinism
pnpm run test:invariants
pnpm run test:architecture
pnpm run build
pnpm run test:e2e:all
```

Focused tests:

```bash
pnpm exec vitest run tests/unit/<slug>.test.ts
pnpm exec vitest run tests/integration/<slug>.test.ts
pnpm run test:e2e:focused tests/e2e/<slug>.spec.ts --list
pnpm run test:e2e:focused tests/e2e/<slug>.spec.ts
```

## 22.6. CI levels

**On every PR**

- Frozen install.
- Typecheck.
- Lint.
- Unit/integration/simulation tests.
- Determinism.
- Invariants.
- Regressions.
- Architecture limits.
- Build.
- Essential E2E Chromium.
- Short fuzz.
- Ten complete headless matches.

**Nightly**

- Browser matrix.
- 1,000 headless matches.
- Expanded fuzz.
- Replay corpus.
- Benchmarks on an identified runner.
- Lifecycle/memory test.

**Manual or pre-release**

- 10,000+ matches.
- 100,000 when budget allows.
- Prolonged soak.
- Real GPU and network tests.

A local minimum coverage of 80% remains a secondary indicator. It does not replace behavioral proofs.

---

# 23. Implementation order and tasks

## 23.1. Task execution rules

Each line below is an increment.

To keep tasks small:

- A task changes at most three production files and two test/documentation files.
- When a line contains a family, execute **one instance per package, system, or definition**.
- Do not turn a family into a giant commit.
- After every three tasks: checkpoint of relevant tests, typecheck, and build.
- End of phase: full gate.
- Default dependency: the previous task of the phase, plus the explicit dependencies.

Test convention:

- Isolated behavior: `tests/unit/<slug>.test.ts`.
- Flow between modules: `tests/integration/<slug>.test.ts`.
- State across ticks: `tests/simulation/<slug>.test.ts`.
- Determinism: `tests/determinism/<slug>.test.ts`.
- Browser: `tests/e2e/<slug>.spec.ts`.

The slug indicated in the table determines the file and the focused command from the previous section.

---

## 23.2. Visual and feedback layer (parallel track)

By user decision (2026-09-17), the visual/feedback layer advances **together
with** the simulation core, not only at Phase 8/9 (ADR-015). It never changes
the architecture core: the simulation stays portable, deterministic, and
single-writer; the renderer is presentation-only and consumes **per-tick
simulation events** filtered by allowed observation.

Frozen contracts:

- **Scale:** `1 tile = 64 render px` (`FIXED_TO_PIXEL = 1/4` of the 256-unit
  fixed tile). All renderer coordinate conversion goes through this factor.
- **Frame geometry:** frame cell is the square of the strip height; frame count
  is `width / height` (validated by `tools/assets/build-manifest.ts`).
- **Animation timing:** wall-clock in the renderer (presentation only); never
  tick-synced, never deterministic.
- **Faction colors:** `PlayerId 0→Blue, 1→Red, 2→Purple, 3→Yellow`
  (Black reserved). Real per-faction art; no tint.
- **Events (deterministic, replay-safe):** `attackFired`, `damageDealt`,
  `unitDied` (Phase 1); `gatherTick` (Phase 2). Derived from state per tick
  (step 19), never persisted in the canonical snapshot; carried to the client
  as `events[]` in the snapshot message. Fog filtering arrives with Phase 3.
- **Fallback:** if an asset fails to load, the renderer falls back to
  placeholders so CI and tests stay green without art.

Deliverables live in `docs/proposals/visual-feedback-layer.md`,
`docs/assets/capabilities.md` (asset capability inventory), and the task
checklists in `docs/tasks/todo.md`. Assets are kept out of git until the pack
license is validated (`.gitignore`: `tmp/`, `apps/web/public/assets/`).

---

## Phase 0 — Foundation and spikes

**Objective:** validate the central risks before real content.

| ID | Deliverable / main files | Acceptance and test |
|---|---|---|
| P0.01 | Materialize the capability map and specs, one per module | Each requirement points to a module; documentary review |
| P0.02 | Register the internal mutability exception | Explicit limit, preserving external rules |
| P0.03 | `package.json`, workspace, Node/pnpm version | Workspace recognized; reproducible install |
| P0.04 | Base TS and portable/Node/browser profiles | Platform imports fail in the portable profile |
| P0.05 | Manifest/tsconfig/index per package, one instance at a time | Topological build without cycles |
| P0.06 | Vitest, Biome, and scripts | An intentionally failing test returns a non-zero exit code |
| P0.07 | Initial CI and hygiene | Pipeline runs gates; artifacts/secrets excluded |
| P0.08 | `shared/fixed.ts`, `rng.ts`, IDs | `deterministic-primitives`: vectors and limits |
| P0.09 | Minimal state and ECS | `ecs-lifecycle`: create/remove/restore |
| P0.10 | `simulation/engine.ts` and tick | `fixed-tick`: exactly one advance per call |
| P0.11 | Minimal serialization/hash/snapshot | `snapshot-roundtrip`: same logical bytes and hash |
| P0.12 | Minimal headless replay | `minimal-replay`: same hashes per tick |
| P0.13 | Minimal validated MOVE command | `move-command`: ownership and atomic rejection |
| P0.14 | Server adapter and single technical session | `authoritative-move`: state changes only on the server |
| P0.15 | Minimal PixiJS renderer | `renderer-lifecycle`: mount/render/dispose without duplication |
| P0.16 | Camera/visual selection and MOVE sending | E2E `select-and-move`: real input to authoritative position |
| P0.17 | Benchmark harness and browser determinism | Reproducible executions; complete reports |
| P0.18 | Run spikes and write ADRs | Section 21 criteria met or documented block |

### Phase 0 Gate

- No prohibited dependencies.
- Deterministic RNG and IDs.
- Snapshot/restore proven.
- Minimal replay proven.
- Browser controls an entity through the server.
- Independent visual loop.
- Camera and selection tested.
- Performance matrix executed.
- Tick rate decided.
- No result presumed.

**Do not start the full economy if this gate fails.**

---

## Phase 1 — Simulation core

| ID | Deliverable | Acceptance and test |
|---|---|---|
| P1.01 | Complete command contracts | `command-schema`: unions and exhaustive limits |
| P1.02 | Atomic preparation/commit | `command-atomicity`: rejection preserves hash/RNG/IDs |
| P1.03 | Order queue, STOP/HOLD/PATROL | `order-lifecycle`: replace/append/cancellation |
| P1.04 | Players, ownership, and wallet | `player-state`: up to four owners and neutrals |
| P1.05 | Minimal instant combat | `basic-combat`: range, cooldown, and damage |
| P1.06 | Simultaneous damage and death | `simultaneous-death`: consistent mutual deaths |
| P1.07 | Victory/draw/tick limit | `victory`: all planned results |
| P1.08 | Central invariants | `core-invariants`: valid sequences preserve state |
| P1.09 | Expanded determinism | `core-replay`: equivalent real streams |

Dependency: Phase 0 approved. Full command contracts, order queue, and complete combat rules.

---

## Phase 2 — Economy and production

| ID | Deliverable | Acceptance and test |
|---|---|---|
| P2.01 | Nodes and worker cargo | `gathering`: no undue resource creation/loss |
| P2.02 | Deposit and return | `deposit`: wallet changes only on deposit |
| P2.03 | Placement/footprints | `placement`: edges, visibility, and overlap |
| P2.04 | Construction and resume | `construction`: absent worker pauses; another resumes |
| P2.05 | Construction cancellation | `construction-refund`: exact formula |
| P2.06 | Supply and reservations | `supply`: destruction allows over-cap without negatives |
| P2.07 | Production queue | `production`: cost, reservation, and completion |
| P2.08 | Blocked spawn and rally | `spawn-rally`: waiting without overlap |
| P2.09 | Producer cancellation/destruction | `production-cancel`: correct reservations and costs |
| P2.10 | Repair | `repair`: cost, limit, and dead target |
| P2.11 | Research and modifiers | `research`: requirements, exclusivity, and effects |
| P2.12 | Economic integration | `economy-chain`: gather→build→produce→research |

Dependency: Phase 1. Full economy on the simulation core.

Economy v0 Mineral Nodes allow any number of eligible Workers to gather in
parallel. Each Worker owns its own 20-tick progress cycle; sorted entity-id
iteration only decides allocation when simultaneous completed cycles contend
for the final remaining minerals. Return routing continues to choose the
nearest owned Base, breaking equal-distance ties by entity id.

---

## Phase 3 — Navigation, complete combat, and fog

| ID | Deliverable | Acceptance and test |
|---|---|---|
| P3.01 | Grid/heap/A* | `astar`: valid and optimal path in small fixtures |
| P3.02 | Serializable incremental search | `path-budget`: same result and availability after restore |
| P3.03 | Invalidation by footprints | `nav-invalidation`: path does not cross new construction |
| P3.04 | Group destinations | `group-goals`: stable and distinct destinations |
| P3.05 | Spatial index | `spatial-query`: equivalent to exhaustive reference |
| P3.06 | Collision and avoidance | `movement-collision`: walls, encounters, and chokepoints |
| P3.07 | Visibility and memory | `vision-memory`: visible/explored/unknown states |
| P3.08 | Observation and event filtering | `fog-noninterference`: equivalent hidden worlds |
| P3.09 | Targeting and pursuit | `targeting`: tie-breaks and loss of vision |
| P3.10 | Projectiles | `projectiles`: impact, dead target, and TTL |
| P3.11 | AoE | `area-damage`: radii, falloff, and absence of friendly fire |
| P3.12 | Combined stress | `army-chokepoint`: progress, collision, and determinism |

Dependencies: Phase 2 and the spike budget. Fog, navigation budget, projectiles/AoE, and group movement.

---

## Phase 4A — M1 content

| ID | Deliverable | Acceptance and test |
|---|---|---|
| P4.01 | Ruleset schema and compiler | `ruleset-validation`: references, limits, and cycles |
| P4.02 | Three Vanguard units | `vanguard-m1-data`: correct attributes and production |
| P4.03 | Three Nexus units | `nexus-m1-data`: correct attributes and production |
| P4.04 | M1 buildings | `buildings-m1-data`: costs and functions |
| P4.05 | Attack/Economy | `upgrades-m1-data`: demonstrated effects |
| P4.06 | Competitive map | `competitive-map`: accessibility and symmetry |
| P4.07 | Headless match with real content | `m1-content-match`: play to result |

Dependency: Phase 3.

---

## Phase 5 — Initial AI

| ID | Deliverable | Acceptance and test |
|---|---|---|
| P5.01 | Agent contract and runner | `agent-boundary`: no write references |
| P5.02 | Strategic economy | `bot-economy`: workers, gathering, Supply, and production |
| P5.03 | Scouting/memory | `bot-scouting`: no hidden coordinates |
| P5.04 | Attack/retreat/focus | `bot-tactics`: decisions from observation |
| P5.05 | Easy/Normal | `bot-difficulty`: no economic/visual bonuses |
| P5.06 | M1 self-play | `bot-selfplay`: 100 matches and completion gate |

Dependency: Phase 4A.

---

## Phase 6 — Rooms and complete multiplayer

The minimal transport from Phase 0 is expanded, not replaced by another architecture.

| ID | Deliverable | Acceptance and test |
|---|---|---|
| P6.01 | Room lifecycle | `room-lifecycle`: allowed/forbidden transitions |
| P6.02 | Slots/configuration/readiness | `room-slots`: four slots, map capacity |
| P6.03 | Membership and tokens | `room-membership`: identity not forgeable via payload |
| P6.04 | Sequences/acks/deduplication | `command-transport`: single execution |
| P6.05 | Filtered snapshot | `filtered-snapshot`: no hidden state |
| P6.06 | Delta/reducer/view hash | `replication`: delta equivalent to snapshot |
| P6.07 | Reconnection and abandonment | `reconnect`: same slot and independent snapshot |
| P6.08 | Rate limits/backpressure | `transport-limits`: slow client does not block simulation |
| P6.09 | Real human/bot session | `room-match`: creation to result |

Dependencies: Phase 3 observation and Phase 5 bot.

---

## Phase 7 — Replay and complete tooling

| ID | Deliverable | Acceptance and test |
|---|---|---|
| P7.01 | Versioned recorder | `replay-recording`: canonical commands and identity |
| P7.02 | Playback/validation/seek | `replay-seek`: equivalent to full reproduction |
| P7.03 | Divergence diagnosis | `replay-divergence`: interval/tick correctly reported |
| P7.04 | Simulator CLI | `simulate-cli`: correct counts and exit codes |
| P7.05 | Fuzz and minimization | `fuzz-artifact`: failure saved and reproducible |
| P7.06 | Tick/entity/command inspectors | `inspect-cli`: values match the replay |
| P7.07 | Statistics and initial balance | `balance-metrics`: aggregation verified by fixture |
| P7.08 | Benchmark corpus/regressions | `benchmark-report`: metadata and comparison |
| P7.09 | Authorized replay download | `replay-access`: only participants after the match ends |

Dependencies: Phase 6. Minimal replay/hash continue to exist since P0.

---

## Phase 8 — Browser MVP and M1 completion

| ID | Deliverable | Acceptance and test |
|---|---|---|
| P8.01 | Home/create/join room | E2E `room-entry`: UI flow |
| P8.02 | Configuration and readiness | E2E `room-ready`: correct start |
| P8.03 | Resource/supply HUD | `hud-state`: replica data |
| P8.04 | Box/shift/double selection | E2E `selection`: expected entities |
| P8.05 | Groups and hotkeys | E2E `control-groups`: save/recall/center |
| P8.06 | Right click and order modes | E2E `context-orders`: expected command |
| P8.07 | Construction and preview | E2E `build-input`: informative preview, server decides |
| P8.08 | Production/research/cancellation | E2E `macro-ui`: queue and rejection feedback |
| P8.09 | Minimap/fog/camera | E2E `minimap`: coordinates and allowed information |
| P8.10 | Interpolation/network states | `client-timeline`: jitter, resync, and visibility |
| P8.11 | Victory/defeat/replay | E2E `match-result`: authoritative result |
| P8.12 | Full flow and DOM accessibility | E2E `full-match`: play until winning |

### Gate M1

In addition to the Definition of Done:

- All product flows work through the real server.
- Three units per faction.
- Economy and research used in integration/E2E tests.
- The E2E match replay reproduces the result.
- Zero known critical failures.
- 1,000 headless matches without crash, desync, or broken invariant.
- Performance of the release scenarios approved.
- Failures and timeouts reported, not hidden.

---

## Phase 4B — M2 content expansion

Run after M1 to expand content on a validated foundation.

| ID | Deliverable | Acceptance and test |
|---|---|---|
| P4B.01 | Factory/Defense | `advanced-buildings`: production and combat |
| P4B.02 | Five remaining Vanguard units, one per increment | `vanguard-<unit>`: role and requirements |
| P4B.03 | Five remaining Nexus units, one per increment | `nexus-<unit>`: role and requirements |
| P4B.04 | Four remaining research topics, one per increment | `upgrade-<id>`: effect/time/cost |
| P4B.05 | Ability/effect system | `ability-effects`: cooldown, cost, and expiration |
| P4B.06 | Brace/Overclock | `faction-abilities`: demonstrated behavior |
| P4B.07 | Expansion/tech/composition AI | `bot-expanded`: uses advanced content |
| P4B.08 | Four-participant fixture | `four-player-match`: no binary assumptions |
| P4B.09 | External agent adapter | `external-agent`: authorized observation and commands |
| P4B.10 | Expanded balance | `balance-matrix`: three matchups, seeds, and strategies |

---

## Phase 9 — Polish and M2 release

| ID | Deliverable | Acceptance and test |
|---|---|---|
| P9.01 | Doodle atlas and visual readability | Visual integration tests, selection, and factions |
| P9.02 | Animations/effects | `visual-events`: no duplication and no leaks |
| P9.03 | Audio manager/mute | `audio-cues`: allowed events, volume, and lifecycle |
| P9.04 | Loading/errors/onboarding | E2E `first-match`: flow without prior knowledge |
| P9.05 | Lifecycle/memory | `session-disposal`: cycles without growing retention |
| P9.06 | Deploy/reverse proxy/health | Production build and WSS smoke |
| P9.07 | Stress and release report | 10,000 matches, replay corpus, and approved perf |

### Gate M2

- Eight units and six research topics per faction.
- Advanced content exercised by tests and AI.
- Agent/Bot combinations validated.
- Four participants in a technical test.
- 10,000 matches without critical failures.
- Reproducible balance statistics.
- Browser matrix approved.
- Documentation and ADRs updated.

---

# 24. Documentation and ADRs

## 24.1. Mandatory documents

| Document | Content |
|---|---|
| `architecture.md` | Modules, dependencies, boundaries |
| `simulation.md` | State, ECS, and system order |
| `determinism.md` | Arithmetic, RNG, ordering, and compatibility |
| `commands.md` | Payloads, validation, and errors |
| `networking.md` | Transport, replication, and reconnection |
| `replay.md` | Format, versions, and diagnosis |
| `ai.md` | Observation, memory, strategy, and tactics |
| `pathfinding.md` | Algorithm, budget, and collision |
| `testing.md` | Suites, fixtures, fuzz, and gates |
| `performance.md` | Hardware, methodology, and baselines |
| `game-design.md` | Rules and content |
| `deployment.md` | Production build, variables, and operation |
| `assets/capabilities.md` | Asset inventory and integration/polish possibilities |

## 24.2. Planned ADRs

1. Isolated simulation and server authority.
2. Tick rate chosen by the spike.
3. Integer/fixed-point arithmetic and RNG.
4. Custom ECS and private writes.
5. System order.
6. Canonical hashing and serialization.
7. PixiJS + pixi-viewport; WebGL2 baseline.
8. Filtered replication instead of client lockstep.
9. Incremental A* with a deterministic budget.
10. Replay and versioning.
11. In-memory rooms and file-based persistence.
12. Visual identity: real RTS sprite pack, supersedes ADR-005 (ADR-015, user decision).

Format:

```text
Context
Decision
Alternatives
Consequences
Evidence
```

---

# 25. Risks and architectural intervention points

| Risk | Mitigation | When to escalate |
|---|---|---|
| Divergence between runtimes | Integers, per-tick hashes, and corpus | Any divergence without a localized cause |
| Incomplete snapshot | Restore tests with paths/queues/effects | Relevant state outside the snapshot |
| Fog leak | Non-interference tests | Any DTO/event revealing hidden state |
| Slow tick | Per-system profiling and load matrix | The 1,000-entity gate fails after localized correction |
| Pathfinding congestion | Budget, per-order search, spatial index | Requires a new algorithm or a versioned budget change |
| Collision without progress | Choke fixtures and deterministic priority | Need to teleport/overlap to make it work |
| Serialization/hash cost | Measure separately | Proposal of incremental hash or binary protocol |
| Excessive network | Compact deltas and backpressure | Need to reduce essential information |
| Inadequate tick rate | Comparative spike | Change after content/replays are frozen |
| Incompatible Pixi/viewport | Spike with fixed versions | Engine or default backend change |
| Bot wins using hidden information | Observation as the only input | Proposed access to GameState |
| Unbalanced content | Data + simulations + human matches | Change of faction identity or fundamental rules |
| Replay versioning | Explicit rejection | Migration or support for old engines |
| Missing GPU/browsers | Identified test environment | Inability to prove visual acceptance |
| Conflicting local rules | Documented and restricted exception | Widening the exception to other boundaries |
| Growing scope | M1/M2 and separate backlog | Feature outside this plan |

## 25.1. Executor autonomy

May decide:

- Names of private helpers.
- Internal organization within the defined modules.
- Additional fixtures.
- Local refactors preserving contracts.
- Dependency patch within the approved line, after validation.
- Proven local optimizations that do not change semantics.

Must stop and request review before:

- Introducing floats as gameplay truth.
- Changing the system order.
- Changing visibility rules.
- Coupling the protocol to internal GameState.
- Moving authority to the browser.
- Swapping the algorithm/semantics of IDs, hash, or RNG.
- Introducing concurrency in advancing the same world.
- Adding WASM/Rust.
- Adding a database, distributed services, or another engine.
- Removing or weakening a gate to make the phase pass.
- Changing victory, economy, or content rules by preference.

When escalating, present:

```text
problem
reproduction
evidence
known cause or hypothesis
alternatives
impact on contracts/replay/tests
recommendation
```

---

# 26. Handoff protocol to the executor model

In a later execution, materialize:

```text
docs/specs/CAPABILITIES.md
docs/specs/SPEC-<module-id>.md
docs/tasks/plan.md
docs/tasks/todo.md
docs/adr/*
```

Each task must contain:

```text
ID
Objective
Dependencies
Planned files
Relevant contract
Up to three acceptance criteria
Verification commands
Evidence
Status
```

The executor model receives only:

1. Repository rules.
2. Module spec.
3. Relevant ADRs.
4. Current task.
5. Dependency contracts.
6. Necessary files and tests.

It does not need to re-read the entire product prompt at each increment.

## 26.1. Operational instruction for the executor

> Execute one task at a time, in dependency order. Write the relevant behavioral tests first. Do not change the architectural decisions of this plan. Record real validation evidence. If a gate fails, reproduce and fix it before proceeding. Every fixed bug must gain a regression. Changes to determinism, authority, fog, serialization, or system order require architectural review.

## 26.2. End-of-phase report

```text
PHASE STATUS

Phase:
Commit/reference:

Implementation:
PASS / FAIL / BLOCKED

Unit:
passed / total

Integration:
passed / total

Simulation:
passed / total

Determinism:
passed / total

Invariants:
passed / total

Regression:
passed / total

E2E:
passed / total

Stress:
games, seeds, failures, timeouts

Performance:
scenario, hardware, p95, p99

Typecheck:
PASS / FAIL

Lint:
PASS / FAIL

Build:
PASS / FAIL

Replay reproduction:
PASS / FAIL

Known issues:
...

Evidence:
commands + artifact paths

Next eligible task:
...
```

If a suite does not yet exist in that phase, record **"not applicable in this phase" with a justification**, never invent a `PASS`.

---

## Conclusion

The design is closed around five commitments:

1. **Portable, deterministic simulation with a single writer.**
2. **Authoritative server and filtered observations for humans and agents.**
3. **Replay, tests, and reproduction from the foundation.**
4. **PixiJS + pixi-viewport handling the visual loop and presentation.**
5. **Two content milestones, with objective criteria before moving forward.**

**The first execution task will be to materialize the specs and set up the Phase 0 foundation. The first gameplay advance will depend on spike approval, not just on a screen working.**
