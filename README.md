# RTS Idle

RTS Idle is a browser-first real-time strategy game built around a deterministic,
server-authoritative simulation.

Players control units, gather resources, construct and manage buildings, produce
armies, and fight through a responsive PixiJS battlefield with a React-powered
HUD. Every gameplay decision is sent as a validated command to the server,
resolved by the isolated simulation core, and returned as authoritative
snapshots and events.

The project is intentionally engineered beyond its current game scope:
deterministic replays, bots, multiplayer rooms, fog of war, and larger
simulations can be added without coupling gameplay rules to the browser,
renderer, or transport layer. Strict TypeScript, fixed-point state, canonical
hashing, architectural boundaries, and layered automated tests make the
simulation reproducible and the codebase safe to evolve.

## Project Model

The runtime flow is:

```text
Browser input
    -> web interaction controller
    -> WebSocket command
    -> authoritative server session
    -> deterministic simulation.step()
    -> snapshot and simulation events
    -> React HUD and PixiJS renderer
```

The browser never decides damage, resources, production, victory, or other
authoritative gameplay results. It sends intent and renders the server's answer.

## Engineering Principles

- **Deterministic simulation:** the same seed, initial state, and command stream
  produce the same result and canonical state hashes.
- **Server authority:** the server validates and applies gameplay commands.
- **Isolated core:** the simulation does not import React, DOM, WebSocket, Node,
  or renderer code.
- **Single writer:** only the simulation step and its systems mutate `GameState`.
- **Typed boundaries:** protocol messages, commands, observations, and snapshots
  are validated and strongly typed.
- **Testable evolution:** unit, simulation, integration, contract, architecture,
  determinism, fuzzing, and browser tests protect the boundaries.

## Technology Stack

| Layer | Technology |
|---|---|
| Language | TypeScript with strict compiler settings |
| Workspace | pnpm workspaces |
| Browser UI | React, React Router, Vite, Tailwind CSS |
| World renderer | PixiJS v8 and pixi-viewport |
| Server | Node.js and WebSocket (`ws`) |
| Simulation | Custom ECS, fixed timestep, fixed-point coordinates |
| Testing | Vitest, fast-check, and Playwright |
| Quality | Biome, TypeScript, architecture barriers, Husky |

## Repository Layout

```text
apps/
  web/        Browser application, HUD, routes, input, and session client
  server/     Authoritative service, sessions, demo content, and transport
packages/
  shared/     Deterministic primitives and domain types
  game-data/  Declarative units, buildings, rules, and maps
  simulation/ Deterministic state, ECS, commands, systems, and snapshots
  protocol/   Versioned wire messages and runtime guards
  renderer/   PixiJS world, camera, input, selection, and effects
  pathfinding/ Grid and navigation primitives
  ai/         Agent decision boundaries
  audio/      Audio integration boundary
tools/
  dev/        Multi-instance development launcher
  e2e/        Browser test orchestration
  quality/    Postmortem status and quality tooling
  benchmark/  Simulation and renderer benchmarks
  balance/    Balance analysis tooling
tests/
  unit/       Pure logic and application tests
  integration/ Cross-package behavior
  simulation/ Deterministic simulation behavior
  contracts/  Protocol and public contracts
  architecture/ Dependency and boundary barriers
  e2e/        Browser user flows
docs/         Architecture, specifications, ADRs, tasks, and postmortems
```

Detailed package boundaries are documented in [`docs/architecture.md`](docs/architecture.md).

## Getting Started

The supported local toolchain is Node 24 from `.nvmrc` and pnpm through
Corepack. Node 20 results are not valid project verification.

```bash
nvm install
nvm use
node --version  # must report v24.x
corepack enable
corepack pnpm install --frozen-lockfile
```

Start the complete local application:

```bash
corepack pnpm dev
```

The default instance uses:

- Web application: `http://localhost:5173`
- WebSocket server: `http://localhost:8080`

Server and web logs appear together with package prefixes. Press `Ctrl+C` to
stop both processes.

## Parallel Development

Reserve one development instance number per agent. Instance 1 uses the normal
command; additional agents use the generic instance launcher.

| Instance | Command | Web | Server |
|---|---|---:|---:|
| 1 | `corepack pnpm dev` | `5173` | `8080` |
| 2 | `corepack pnpm dev:instance -- 2` | `5174` | `8081` |
| 3 | `corepack pnpm dev:instance -- 3` | `5175` | `8082` |
| 4 | `corepack pnpm dev:instance -- 4` | `5176` | `8083` |

For instance `N`, the web port is `5172 + N` and the server port is `8079 + N`.
The launcher uses the same recursive parallel workspace output as `pnpm dev`.
Do not reuse another agent's instance number or use the removed `dev:2` alias.

If a port is occupied, inspect the listener before stopping it:

```bash
ss -ltnp
kill <PID>
```

Each agent should open the web URL belonging to its own instance.

## Validation Commands

Fast iteration:

```bash
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run test:unit
```

Focused browser iteration:

```bash
corepack pnpm exec playwright install chromium firefox
corepack pnpm run test:e2e:focused tests/e2e/<target>.spec.ts --list
corepack pnpm run test:e2e:focused tests/e2e/<target>.spec.ts
```

Completion gate:

```bash
corepack pnpm run verify
```

Useful validation groups:

| Command | Purpose |
|---|---|
| `corepack pnpm run verify:fast` | Typecheck, lint, and unit tests |
| `corepack pnpm run verify:simulation` | Simulation, contracts, orders, determinism, architecture, and invariants |
| `corepack pnpm run test:unit` | Unit tests across the repository |
| `corepack pnpm run test:simulation` | Deterministic simulation tests |
| `corepack pnpm run test:e2e:fast` | Chromium and Firefox functional browser tests |
| `corepack pnpm run test:e2e:perf` | Renderer performance tests |
| `corepack pnpm run build` | Topological package and web build |
| `corepack pnpm run balance -- --games 1000` | Analyze matchup balance |
| `corepack pnpm run benchmark` | Run simulation and renderer benchmarks |

## Future Direction

The architecture is designed to support the following extensions without
coupling them to the browser presentation layer:

- AI-controlled opponents and bots driven by observations.
- Deterministic replay and playback tooling.
- Multiplayer rooms and session orchestration.
- Fog of war and filtered player observations.
- Grid pathfinding and collision-aware movement.
- Larger simulations and performance-oriented scaling.

These are project directions, not a substitute for the operational state of the
repository.

## Documentation Map

- [`CURRENT_STATE.md`](CURRENT_STATE.md): current implementation state and active work.
- [`docs/architecture.md`](docs/architecture.md): module layout and dependency boundaries.
- [`docs/engineering-standard.md`](docs/engineering-standard.md): coding and quality standards.
- [`docs/ai/EXECUTION_PROTOCOL.md`](docs/ai/EXECUTION_PROTOCOL.md): required agent workflow and validation.
- [`docs/commands.md`](docs/commands.md): authoritative command contract.
- [`docs/testing/manual-smoke.md`](docs/testing/manual-smoke.md): manual browser checks.
- [`docs/tasks/todo.md`](docs/tasks/todo.md): task board and remaining work.
- [`docs/specs/`](docs/specs/): capability and module specifications.
- [`docs/adr/`](docs/adr/): architectural decisions and tradeoffs.
- [`docs/postmortems/`](docs/postmortems/): bug root causes and permanent regressions.

## Release And Contribution Workflow

Use conventional commits, keep changes focused, and run the relevant validation
before opening a pull request. Husky, lint-staged, commitlint, Biome, typecheck,
architecture barriers, and CI enforce the repository quality baseline.

The detailed branch and stacked-PR workflow is documented in
[`docs/ai/STACKED-PR-WORKFLOW.md`](docs/ai/STACKED-PR-WORKFLOW.md).
