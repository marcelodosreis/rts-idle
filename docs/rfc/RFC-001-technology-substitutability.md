# RFC-001 — Technology Substitutability Boundaries

Status: **Proposed** (no implementation started)
Date: 2026-09-18
Source: architecture audit, 2026-09-18 (chat deliverable)
Related: ADR-001 (isolated simulation), ADR-009 (tick rate), ADR-010 (PixiJS),
`docs/architecture.md`, `docs/engineering-standard.md`

## Summary

This RFC records the architectural audit of the decoupling/substitutability of
the current system and the incremental plan to introduce the few boundaries that
materially increase the ability to replace technology without touching gameplay.

The goal is **not** Clean Architecture. The goal is to preserve the current
simple architecture while making four seams replaceable: **observation**,
**transport**, **platform**, and **renderer contract**. Input and camera stay
inside the rendering adapter.

## 1. Principle

> Technology may depend on the game. The game must never depend on technology.

The existing isolation of `packages/simulation` (enforced by
`tests/architecture/simulation-isolation.test.ts`) is the most valuable asset in
the repository and must remain intact. Every change below preserves it.

## 2. Current architecture

### 2.1 Real layers

| Layer | Sub-layers | Location |
|---|---|---|
| Platform/browser | globals, storage, URL/env, networking, timing | spread across `apps/web`, `packages/renderer` |
| Client runtime | bootstrap, app, screen, session hook | `apps/web/src` |
| Client network | concrete connection, snapshot→frame translation | `apps/web/src/client/` |
| UI/HUD | pure React chrome + Radix primitives | `apps/web/src/hud/`, `components/ui/` |
| Renderer | contract, Pixi orchestrator, layers, assets | `packages/renderer/src` |
| Protocol | wire messages + runtime guards | `packages/protocol/src/messages` |
| Shared kernel | fixed, rng, ids, players, commands, events | `packages/shared/src` |
| Simulation | engine, ecs, systems, commands, canonical, snapshot, state, invariants | `packages/simulation/src` |
| Server | bootstrap/transport, authority + projection, content | `apps/server/src` |
| Content/game-data | maps (with presentation fields) | `packages/game-data/src` |
| Stubs | ai, audio, pathfinding (version only) | `packages/{ai,audio,pathfinding}/src/index.ts` |

### 2.2 Dependency direction (enforced)

Enforced by `tests/architecture/package-dependencies.test.ts`:

```text
shared (none)
game-data, pathfinding, protocol → shared
simulation → shared, game-data, pathfinding
ai → shared, game-data, simulation
renderer → shared, protocol, game-data   (+ pixi.js, pixi-viewport)
server → shared, simulation, protocol, ai
web → shared, protocol, renderer, audio, game-data
```

No package cycles. `simulation-isolation.test.ts` additionally forbids `react`,
`pixi.js`, `ws`, `node:`, `@rts/protocol|renderer|ai` inside the simulation.

Barrier weaknesses:

- Only `@rts/*` imports are checked; direct third-party imports and browser
  globals are not.
- `det/` and `perf/` exclusions are by directory name
  (`package-dependencies.test.ts:34`).
- `apps/web` may import `pixi.js`/`pixi-viewport` freely (the sprite lab does:
  `apps/web/src/sprites/lab/app.ts:1`).

### 2.3 Dangerous couplings (evidence)

| Coupling | Evidence |
|---|---|
| Server game logic → ECS internals | `apps/server/src/sessions/session.ts:137-213` (`world.store(Position/Owner/Health/Kind/Orders/Movement/Cargo/Base/MineralNode)`) |
| Client runtime → platform globals | `apps/web/src/screens/useMatchSession.ts:13-19,128,363-384` |
| Client runtime → concrete Pixi | `useMatchSession.ts:2,130` |
| Renderer contract → Pixi type | `packages/renderer/src/types.ts:4,77` (`PointData`) |
| Renderer contract → protocol vocabulary | `packages/renderer/src/types.ts:2` (`EconomyPhase`, `OrderState`) |
| Content → server code | `apps/server/src/demo.ts`, `apps/server/src/demo/scenarios.ts` |
| game-data → presentation | `packages/game-data/src/maps/types.ts:47-66` |
| Shared → asset contract | `packages/shared/src/asset-manifest.ts` |
| Test/debug global in runtime | `useMatchSession.ts:56-60,276-317` (`window.__rtsDebug`) |
| Concrete transport on both sides | `apps/web/src/client/connection.ts:19`, `apps/server/src/main.ts:20` |

Not found (good): gameplay → Pixi, entity → sprite, renderer mutating gameplay,
package cycles.

## 3. Boundaries to introduce

### 3.1 `PlayerObservation`

- **Current:** the server reads ECS directly (`session.ts:137-213`); `inspectState()`
  returns public `GameState`/`World` (`packages/simulation/src/engine/simulation-host.ts:20`),
  contradicting `docs/master-plan.md:471-476` (`observe(playerId)`).
- **Problem:** projection knows component internals; ECS changes break the
  server; `inspectState()` costs ~6 full serialize/deserialize per tick
  (`engine/simulation.ts:55-57`).
- **Files:** `packages/simulation/src/engine/simulation-host.ts`,
  `engine/simulation.ts`, new `contracts/observation.ts`, new `engine/observe.ts`,
  `contracts/index.ts`, `src/index.ts`.
- **New boundary:**

```ts
export interface ObservedUnit {
  readonly id: EntityId
  readonly x: Fixed
  readonly y: Fixed
  readonly owner: PlayerId
  readonly kind: UnitKind
  readonly hp?: { readonly current: number; readonly max: number }
  readonly frontOrder?: Order
  readonly hasMovement: boolean
  readonly cargo?: { readonly amount: number; readonly capacity: number }
}
export interface ObservedBase { readonly id: EntityId; readonly x: Fixed; readonly y: Fixed; readonly owner: PlayerId }
export interface ObservedMineralNode { readonly id: EntityId; readonly x: Fixed; readonly y: Fixed; readonly remaining: number }
export interface ObservedPlayer { readonly id: PlayerId; readonly defeated: boolean; readonly gold: number }
export interface PlayerObservation {
  readonly viewerId: PlayerId
  readonly tick: number
  readonly phase: Phase
  readonly units: readonly ObservedUnit[]
  readonly bases: readonly ObservedBase[]
  readonly mineralNodes: readonly ObservedMineralNode[]
  readonly players: readonly ObservedPlayer[]
}
// SimulationHost (additive)
observe(playerId: PlayerId): PlayerObservation
phase(): Phase
```

- **Direction:** before `server → ECS internals`; after `server → PlayerObservation`.
- **Minimal API:** `observe(playerId)` + `phase()` on the host; pure
  `observeState(state, viewerId)` in `engine/observe.ts`. `OrderState`/`EconomyPhase`
  stay in the server projection (§3.2); the observation exposes `Order` (already
  public) and `cargo`.
- **Imports removed:** none yet (server-side removal lands in §3.2).
- **Imports added:** simulation exports `PlayerObservation` and friends;
  `observe.ts` imports ECS components internally.
- **Risk:** low (additive). `inspectState()` is **kept** — it is used by ~80
  test lines in `tests/simulation`, `tests/contracts`, `tests/orders`.
- **Tests:** new `tests/unit/observation.test.ts` (units/bases/nodes/players,
  `hasMovement`, `frontOrder`, `cargo`, `phase`, buffer independence);
  `verify:simulation` stays green.
- **Benefit:** removes the last structural ECS leak; enables fog via `viewerId`;
  reduces per-tick cost.
- **Independent:** yes; base for §3.2.

### 3.2 Authority × projection/wire

- **Current:** `GameSession` (`session.ts:93`) is authority **and** projection
  (`projectUnits/Bases/MineralNodes/Players`, `deriveOrderState`/`deriveEconomy`);
  `main.ts:53-67` builds the `SnapshotMessage`.
- **Problem:** presentation derivation and ECS access live with authority;
  replacing protocol/server forces rewriting authority.
- **Files:** `apps/server/src/sessions/session.ts`, new
  `apps/server/src/sessions/projection.ts`, `apps/server/src/main.ts`,
  `apps/server/src/index.ts`, `tests/integration/session-commands.test.ts`, new
  `tests/architecture/server-isolation.test.ts`.
- **New boundary:**

```ts
// sessions/projection.ts (pure; no simulation/ECS access)
export function projectObservation(
  observation: PlayerObservation,
  events: readonly SimulationEvent[]
): SnapshotMessage
```

`GameSession` keeps only `submit`, `advance`, `snapshot`, `observe`, `phase`,
`hashState`, `identity`.

- **Direction:** before `main → GameSession(authority+projection+ECS)`; after
  `main → GameSession(authority) → simulation.observe` and
  `main → projectObservation → protocol`.
- **Minimal API:** the pure function above; `deriveOrderState`/`deriveEconomy`
  move from `session.ts:45-87` unchanged.
- **Imports removed:** `session.ts` drops `Base, Cargo, Health, Kind, MineralNode,
  Movement, Orders, Owner, Position` and projection-only `SimulationSnapshot`.
- **Imports added:** `projection.ts` imports `Order`/`CargoData`/`PlayerObservation`
  from `@rts/simulation` and `SnapshotMessage`/`SnapshotEconomy` from `@rts/protocol`.
- **Risk:** medium; wire output must be identical (validate before/after + E2E).
- **Tests:** integration uses `projectObservation(session.observe(0), [])`;
  `server-isolation.test.ts` forbids `inspectState(` in `apps/server/src`
  (`world.store` is banned later in §3.9).
- **Benefit:** server infra can change without touching authority; protocol
  evolves only in `projection.ts`.
- **Independent:** depends on §3.1.

### 3.3 `MatchConnection` as a real port

- **Current:** `apps/web/src/client/connection.ts` defines `MatchConnection`/
  `ConnectionHandlers` **and** `connectMatch()` with `new WebSocket` (`:19`);
  `useMatchSession.ts:6,274` imports the concrete.
- **Problem:** port and adapter in one file; swapping transport edits the runtime.
- **Files:** split `connection.ts` into `client/match-connection.ts` (types) and
  `client/websocket-transport.ts` (adapter); update `useMatchSession.ts`.
- **New boundary:** `match-connection.ts` holds only `MatchConnection` and
  `ConnectionHandlers`; `websocket-transport.ts` exports
  `connectWebSocket(url, handlers): MatchConnection`. No factory interface.
- **Direction:** before `runtime → connectMatch(WS)`; after
  `runtime → MatchConnection` and `composition root → connectWebSocket`.
- **Minimal API:** already exists; only relocated.
- **Imports removed:** `useMatchSession.ts` no longer imports `connectMatch`.
- **Imports added:** `useMatchSession.ts` imports port types from
  `client/match-connection` and `connectWebSocket` from `client/websocket-transport`.
- **Risk:** low (move code).
- **Tests:** typecheck + E2E `select-and-move`, `economy-playable`,
  `renderer-lifecycle`.
- **Benefit:** another transport = one new file + composition-root change.
- **Independent:** yes.

### 3.4 WebSocket adapter

- **Current:** WS + JSON + guards mixed with the contract.
- **Problem:** `WebSocket`, `WebSocket.OPEN`, `JSON.parse`, `isSnapshotMessage`
  live with the port.
- **Files:** `apps/web/src/client/websocket-transport.ts`.
- **New boundary:** single adapter containing `new WebSocket`, parse, guard;
  exposes only `MatchConnection`.
- **Direction:** `runtime → MatchConnection ← WebSocketAdapter`.
- **Imports added:** adapter imports `isSnapshotMessage`/`SnapshotMessage` from
  `@rts/protocol`.
- **Risk:** low.
- **Tests:** same as §3.3; `tests/unit/snapshot-to-frame.test.ts` untouched.
- **Benefit:** protocol/transport replaceable without runtime changes.
- **Independent:** same PR as §3.3.

### 3.5 `PlatformServices`

- **Current capabilities used by the playable client:**
  - env: `import.meta.env.VITE_SERVER_URL` (`useMatchSession.ts:19`)
  - query: `window.location.search` at module scope (`:13-18`) and in the effect
    (`:128`); mutation at `:369,375,384`
  - storage: `window.localStorage` (`:128`)
  - navigation: `window.location.reload()` (`:363`)
  - debug global: `window.__rtsDebug` (`:56-60,276,317`)
  - (`new URLSearchParams` is standard and stays.)
- **Problem:** runtime tied to globals; Tauri/desktop port contaminates runtime.
- **Files:** new `apps/web/src/platform/platform.ts`,
  `apps/web/src/platform/browser-platform.ts`, `apps/web/src/client/debug.ts`;
  `useMatchSession.ts`, `screens/playtest-map.ts` (move `StorageReader`),
  `screens/MatchScreen.tsx`, `app/App.tsx`.
- **New boundary (flat, derived from real usage — no hierarchy):**

```ts
export interface PlatformServices {
  readonly locationSearch: string
  readonly serverUrl: string
  readonly storage: StorageReader
  reload(): void
  navigate(params: URLSearchParams): void
  readonly debug: DebugBridge
}
export interface DebugBridge {
  expose(api: RtsDebug): void
  clear(): void
}
```

- **Direction:** before `runtime → window/localStorage/env`; after
  `runtime → PlatformServices ← BrowserPlatform`.
- **Imports removed:** `useMatchSession.ts` loses `window.*` and `import.meta.env`.
- **Imports added:** `useMatchSession.ts` imports `PlatformServices`;
  `App.tsx` imports `createBrowserPlatform`.
- **Risk:** medium — module-scope constants (`SCENARIO`, `AGGRESSION`,
  `SPRITES_ENABLED`, `SERVER_URL`) move into the hook preserving behavior;
  validate scenario/navigation E2E.
- **Tests:** E2E `scenarios`, `sprites-lab` (`getMapInfo`/`map=local`),
  `economy-playable`.
- **Benefit:** enables Tauri/Steam without touching gameplay; removes globals
  from the runtime.
- **Independent:** yes.

### 3.6 `BrowserPlatform`

- **Current:** does not exist.
- **New boundary:** `createBrowserPlatform(): PlatformServices` reads
  `import.meta.env`, `window.location.search`, `window.localStorage`, implements
  `reload`/`navigate`, and a `DebugBridge` over `window.__rtsDebug`.
- **Files:** `apps/web/src/platform/browser-platform.ts`.
- **Direction:** `BrowserPlatform → PlatformServices` (implements); only the
  composition root imports it.
- **Minimal API:** one factory function; no class, no container.
- **Risk:** low.
- **Benefit:** single place where a future `TauriPlatform`/`SteamPlatform` plugs in.
- **Independent:** same PR as §3.5.

### 3.7 `GameRenderer` contract cleanup

- **Current:** `packages/renderer/src/types.ts` imports `PointData` from
  `pixi.js` (`:4`) and uses it in `RendererOptions.initialCenter` (`:77`);
  `GameRenderer` (`:84-111`) mixes presentation and diagnostics.
- **Problem:** a Pixi type appears in the contract.
- **Files:** `packages/renderer/src/types.ts`, `renderer.ts`, `index.ts`,
  `apps/web/src/perf/main.ts` (already pure), `useMatchSession.ts`.
- **New boundary (minimal production contract):**

```ts
export interface GameRenderer {
  mount(host: HTMLElement, callbacks: RendererCallbacks): Promise<void>
  present(frame: RenderFrame): void
  resize(width: number, height: number): void
  dispose(): void
  setSelection(ids: readonly number[]): void
  moveCamera(x: number, y: number): void
  readonly debug?: RendererDebug
}
```

`initialCenter?: { readonly x: number; readonly y: number }`.

- **Direction:** `Client → GameRenderer ← PixiRenderer`; zero Pixi in the contract.
- **Imports removed:** `import type { PointData } from 'pixi.js'` in `types.ts`.
- **Imports added:** none.
- **Risk:** low; `resize` is currently unused by the app (the sprite lab has its
  own path) but remains part of the lifecycle.
- **Tests:** typecheck + renderer E2E.
- **Benefit:** an alternative renderer implements a pure contract.
- **Independent:** yes.

### 3.8 `RendererDebug` separation

- **Current:** diagnostics live on the contract (`getUnitPositions`,
  `getUnitAnimationFrame`, `getUnitHealth`, `getUnitSpriteState`, `getSelection`,
  `getZoom`, `getPing`, `worldToScreen`), used only by `__rtsDebug`
  (`useMatchSession.ts:279-299`). Production uses `mount`, `present`,
  `setSelection`, `dispose` (+ `moveCamera`).
- **Problem:** any alternative renderer must fake Pixi concepts (`glyph`,
  `shape`, `inTree`, `facing`, `scale`).
- **New boundary:**

```ts
export interface RendererDebug {
  getSelection(): readonly number[]
  getUnitPositions(): ReadonlyMap<number, { readonly x: number; readonly y: number }>
  getUnitAnimationFrame(id: number): number | null
  getUnitHealth(id: number): { readonly current: number; readonly max: number } | null
  getUnitSpriteState(id: number): {
    readonly visible: boolean
    readonly frame: number | null
    readonly anim: 'idle' | 'run' | 'attack' | 'fallback'
    readonly inTree: boolean
    readonly facing: number
    readonly scale: number
    readonly glyph: string | null
    readonly shape: 'circle' | 'square' | 'triangle' | null
  } | null
  getZoom(): number
  getPing(): { readonly x: number; readonly y: number } | null
  worldToScreen(x: number, y: number): { readonly x: number; readonly y: number }
}
```

`PixiRenderer implements GameRenderer, RendererDebug` and exposes
`debug: RendererDebug`.

- **Direction:** `useMatchSession → renderer.debug` (optional) for E2E;
  production uses only `GameRenderer`.
- **Risk:** low; adjust `useMatchSession` and the `__rtsDebug` hook.
- **Tests:** E2E `sprite-fallback`, `visual-feedback-base`, `selection-feedback`,
  `regression-units-visible`, `hud-commands`.
- **Benefit:** small, pure production contract.
- **Independent:** same PR as §3.7.

### 3.9 Content/scenarios out of the server

- **Current:** `apps/server/src/demo.ts` builds the `World` via `world.store`
  (`:43-79`); `apps/server/src/demo/scenarios.ts` holds the catalog + seed.
  `packages/game-data` exists and is unused by the server; the barrier
  (`package-dependencies.test.ts:29`) does not even allow `server → game-data`.
- **Problem:** content hardcoded in server code; `game-data` is the natural home.
- **Files:** new `packages/game-data/src/scenarios/{types,catalog}.ts`,
  `game-data/src/index.ts`; new `packages/simulation/src/scenarios/build-world.ts`,
  `simulation/src/index.ts`; `apps/server/src/demo.ts` (thin); delete
  `apps/server/src/demo/scenarios.ts`; `tests/architecture/package-dependencies.test.ts`,
  `docs/engineering-standard.md`, `docs/architecture.md`.
- **New boundary:**

```ts
// game-data: pure data
export interface ScenarioDefinition { /* spawns, bases, mineralNodes, attacks, playerIdle */ }
export const SCENARIO_SEED = 123456
export function scenarioById(id: string | undefined): ScenarioDefinition

// simulation: initial-state instantiation (knows ECS)
export function buildWorldFromScenario(
  scenario: ScenarioDefinition,
  options: { readonly aggression: 'offensive' | 'passive' }
): World
```

`apps/server/src/demo.ts` becomes ~10 lines: `scenarioById` +
`buildWorldFromScenario` + `GameSession.create`.

- **Direction:** before `content → server(ECS)`; after
  `game-data (data) → simulation (builder) ← server`.
- **Imports removed:** `demo.ts` drops `allocateEntityId`,
  `Base/Cargo/Combat/Health/Kind/MineralNode/Movement/Orders/Owner/Position/createWorld`;
  the server loses scenario literals.
- **Imports added:** server imports `@rts/game-data` (update the barrier) and
  `buildWorldFromScenario` from `@rts/simulation`.
- **Risk:** medium — update the dependency matrix and docs; verify the generated
  match is identical (hash/observation).
- **Tests:** `tests/integration/session-commands.test.ts`, `test:architecture`,
  `build`, plus an initial-world parity test (same ids/positions).
- **Benefit:** content evolves without touching the server; server becomes pure
  infrastructure.
- **Independent:** yes; recommended after §3.2 so `world.store` can then be
  banned in the server.

## 4. Input and camera decision

**Do not separate.** Evidence: pointer events are routed by the Pixi `Viewport`
and depend on `viewport.toWorld` (`renderer.ts:104-134`, `selection.ts:75-76`);
box selection and rings use `Graphics`/`PointData`. The boundary that matters for
gameplay already exists: `RendererCallbacks` (`types.ts:62-70`) translates input
into abstract commands. Ports for input/camera would be artificial: every
renderer must solve hit-testing/camera its own way, and no external consumer
would reuse those ports. Input and camera belong to the rendering adapter.

## 5. Explicit non-goals

No DI container; no interface for everything; no artificial content repository;
no abstraction over ECS/RNG/fixed/shared; no speculative Steam/Tauri adapters;
no renderer port inside the simulation; no abstract clock/ticker inside the
renderer.

## 6. Same decoupling with fewer abstractions

| Temptation | Decision |
|---|---|
| `Renderer` port inside `packages/simulation` | No — the barrier already prevents it. |
| `TransportFactory`/`ITransport` | No — `MatchConnection` is already the port. |
| `Platform` sub-interfaces per capability | No — one flat interface derived from real usage. |
| `@rts/observation` package | No — `observe()` on the host keeps ECS inside the core. |
| Move `OrderState`/`EconomyPhase` to `shared` | No — the server derives from `Order`/`cargo`; avoids touching protocol/renderer. |
| Content repository | No — typed static data in `game-data`. |
| Remove `inspectState()` now | No — ~80 test usages; keep it read-only and ban it in the server. |

## 7. Target architecture

```text
App (composition root)
  ├─ createBrowserPlatform() : PlatformServices
  └─ MatchScreen → useMatchSession(host, platform)
        ├─ GameRenderer (pure) ← PixiRenderer (adapter)   [debug?: RendererDebug]
        ├─ MatchConnection (port) ← WebSocketAdapter
        └─ PlatformServices ← BrowserPlatform
server main.ts
  ├─ GameSession (authority: submit/advance/observe/phase/hash)
  ├─ projectObservation(PlayerObservation, events) : SnapshotMessage (pure)
  └─ scenarioById (game-data) + buildWorldFromScenario (simulation)
Simulation: SimulationHost.observe(playerId) → PlayerObservation
```

No new dependency of the game on technology; Tauri/Steam would plug only into
`PlatformServices` and the composition root.

## 8. PR plan

Each PR leaves the project working with all tests green.

### PR 1 — Renderer contract + debug separation (§3.7, §3.8)

- **Objective:** pure, small `GameRenderer`; `RendererDebug` separate.
- **Files:** `packages/renderer/src/types.ts`, `renderer.ts`, `index.ts`;
  `apps/web/src/screens/useMatchSession.ts`; verify `apps/web/src/perf/main.ts`.
- **Change:** remove `PointData`; add `RendererDebug`; `PixiRenderer` implements
  both and exposes `debug`.
- **Tests:** typecheck, lint, renderer/feedback E2E.
- **Completion:** `types.ts` has no `pixi.js` imports; `GameRenderer` has no debug
  methods; E2E green.

### PR 2 — Transport port + WebSocket adapter (§3.3, §3.4)

- **Objective:** separate `MatchConnection` from `WebSocket`.
- **Files:** new `apps/web/src/client/match-connection.ts`,
  `apps/web/src/client/websocket-transport.ts`; remove `connection.ts`; update
  `useMatchSession.ts`.
- **Change:** move types and `new WebSocket`/parse into the adapter.
- **Tests:** typecheck + E2E `select-and-move`, `economy-playable`.
- **Completion:** no `WebSocket` outside `websocket-transport.ts`; runtime imports
  only the port.

### PR 3 — PlatformServices + BrowserPlatform (§3.5, §3.6)

- **Objective:** remove browser globals from the runtime.
- **Files:** new `apps/web/src/platform/{platform,browser-platform}.ts`,
  `apps/web/src/client/debug.ts` (move `RtsDebug`); `useMatchSession.ts`,
  `screens/playtest-map.ts`, `screens/MatchScreen.tsx`, `app/App.tsx`.
- **Change:** `useMatchSession(host, platform)`; module constants move into the
  hook; debug via `platform.debug`.
- **Tests:** typecheck + E2E `scenarios`, `sprites-lab`, `economy-playable`.
- **Completion:** `useMatchSession.ts` has no `window`/`localStorage`/`import.meta.env`.

### PR 4 — `PlayerObservation` in the simulation (§3.1)

- **Objective:** expose domain observation without breaking anything.
- **Files:** `packages/simulation/src/contracts/observation.ts`, `contracts/index.ts`,
  `engine/observe.ts`, `engine/simulation.ts`, `engine/simulation-host.ts`,
  `src/index.ts`; new `tests/unit/observation.test.ts`.
- **Change:** add `observe(playerId)` and `phase()`; server untouched.
- **Tests:** new observation test + `verify:simulation`.
- **Completion:** observation correct and immutable; `inspectState()` kept;
  hash/determinism unchanged.

### PR 5 — Authority × projection in the server (§3.2)

- **Objective:** `apps/server` stops touching ECS during projection.
- **Files:** `apps/server/src/sessions/session.ts`, new
  `sessions/projection.ts`, `apps/server/src/main.ts`, `apps/server/src/index.ts`;
  `tests/integration/session-commands.test.ts`; new
  `tests/architecture/server-isolation.test.ts`.
- **Change:** `GameSession` authority only; pure `projectObservation`; `main.ts`
  calls `observe` once per tick.
- **Tests:** integration, contracts, architecture, E2E
  `economy-playable`/`visual-combat`.
- **Completion:** `inspectState(` absent from `apps/server/src`; wire identical to
  before.

### PR 6 — Content/scenarios out of the server (§3.9)

- **Objective:** content in `game-data`; instantiation in `simulation`.
- **Files:** new `packages/game-data/src/scenarios/{types,catalog}.ts`,
  `game-data/src/index.ts`; new `packages/simulation/src/scenarios/build-world.ts`,
  `simulation/src/index.ts`; `apps/server/src/demo.ts`; delete
  `apps/server/src/demo/scenarios.ts`; `tests/architecture/package-dependencies.test.ts`;
  `docs/engineering-standard.md`, `docs/architecture.md`.
- **Change:** scenario data in `game-data`; `buildWorldFromScenario` in
  `simulation`; thin server; allow `server → game-data` in the barrier and ban
  `world.store` in the server.
- **Tests:** integration, unit, architecture, build + initial-world parity.
- **Completion:** no scenario literals in the server; updated barrier green.

Dependencies: PR 5 depends on PR 4; PR 6 is ideally after PR 5 (to tighten the
barrier); PR 1–3 are independent.

## 9. Tracking

| PR | Title | Status | Depends on |
|----|-------|--------|------------|
| RFC-001-PR1 | Renderer contract + debug separation | todo | — |
| RFC-001-PR2 | Transport port + WebSocket adapter | todo | — |
| RFC-001-PR3 | PlatformServices + BrowserPlatform | todo | — |
| RFC-001-PR4 | `PlayerObservation` | todo | — |
| RFC-001-PR5 | Authority × projection | todo | RFC-001-PR4 |
| RFC-001-PR6 | Content/scenarios to `game-data` | todo | RFC-001-PR5 |

Maintenance rules:

- Each PR flips its status here and in `docs/ai/TASK_INDEX.md`.
- This RFC moves from `Proposed` to `Accepted` only on user approval.
- No implementation starts before its PR is marked `in-progress`.

## 10. Risks and dependencies

- **Highest risk:** PR 5 (wire output must be byte-for-byte equivalent from the
  client's perspective). Mitigation: compare snapshots before/after and run E2E.
- **Medium risk:** PR 3 (module-scope constants move into the hook) and PR 6
  (barrier/docs update + world parity).
- **Low risk:** PR 1, PR 2, PR 4.
- **Global constraint:** never break `packages/simulation` isolation; the
  architecture tests are the guardrail.

## 11. Out of scope

- Tauri and Steam adapters (only the `PlatformServices` seam is prepared).
- Input/camera extraction (decided against, §4).
- Fog of war, multiplayer rooms, persistence, authentication.
- `game-data` domain/presentation map split (do it together with
  pathfinding/terrain gameplay, not before).
