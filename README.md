# RTS Idle

An extremely responsive competitive RTS with simple aesthetics — and a simulation engine engineered far above the size of the game.

## What this is

A browser RTS built on a deterministic, server-authoritative simulation core — engineered to scale to thousands of entities, replay, and full multiplayer without rewriting the core.

## Design rules (non-negotiable)

- **Isolated simulation.** `packages/simulation` imports no React, DOM, WebSocket, Node APIs, or renderer. The same code runs in the browser, on the server, in CLI tools, in tests, in replay, and in fuzzing.
- **Determinism.** Same seed + initial state + command stream → same result. Verified by per-tick canonical state hashes.
- **Server authority.** Clients send commands and render. They never compute damage, resources, production, or victory.
- **Single writer.** Only the simulation's `step()` mutates GameState. Commands, observations, and snapshots are immutable outside it.
- **Fog of war.** Humans and bots receive only filtered observations — nothing a player couldn't see.
- **Replay is first-class.** Seed + rules + canonical commands reproduce a match exactly, anywhere.

## Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict) |
| Monorepo | pnpm workspaces |
| Rendering | PixiJS v8 + pixi-viewport (WebGL2) |
| UI | React (menus, room, HUD) |
| Server | Node + `ws` |
| Tests | Vitest, fast-check (fuzz), Playwright (E2E) |
| Lint / format | Biome |

## Repository layout

```text
apps/
  web/        Browser app: screens, room, HUD, network client
  server/     Node service: rooms, sessions, authority, transport
packages/
  shared/     Deterministic primitives: fixed point, xoshiro128**, entity IDs
  game-data/  Declarative content: units, buildings, upgrades, maps
  pathfinding/Grid, incremental A*, spatial index
  simulation/ Core: GameState, ECS, commands, systems, observations
  protocol/   Versioned wire messages
  renderer/   PixiJS world: camera, layers, selection, minimap
  audio/      Audio cues
tools/        Headless CLI: replay, simulate, fuzz, balance, benchmark
tests/        unit, integration, simulation, determinism, invariants, fuzz, e2e, architecture
docs/         master-plan.md, specs/, adr/
```

Dependency direction is enforced and verified by tests: the simulation stays isolated from UI, transport, and platform packages.

## Getting started

Prerequisites: NVM, Node 24 from `.nvmrc`, and Corepack. Local command workflow
and validation rules are defined in [`docs/ai/EXECUTION_PROTOCOL.md`](docs/ai/EXECUTION_PROTOCOL.md).

```bash
nvm install
nvm use
node --version  # must report v24.x
corepack enable
corepack pnpm install --frozen-lockfile

# Run the whole app locally (authoritative server + browser app, one command).
# Logs are prefixed [@rts/server] / [@rts/web]; Ctrl+C stops both.
corepack pnpm dev

# Or run the two dev servers in separate terminals:
corepack pnpm --filter @rts/server dev   # authoritative WS server on :8080
corepack pnpm --filter @rts/web dev      # Vite app on :5173

corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run test:unit
corepack pnpm run build

# Full local validation gate (typecheck + lint + all suites + build):
corepack pnpm run verify
```

Node 20 is not a supported validation environment for this project; a passing
test or build under Node 20 does not count as verification.

### E2E (Playwright)

```bash
corepack pnpm exec playwright install chromium firefox
corepack pnpm run test:e2e:focused tests/e2e/<target>.spec.ts --list
corepack pnpm run test:e2e:focused tests/e2e/<target>.spec.ts
```

On WSL2/Linux, system libraries may be required (Playwright needs sudo; make sure the pnpm in your nvm PATH is visible to it):

```bash
sudo env "PATH=$PATH" corepack pnpm exec playwright install-deps chromium firefox
```

## Scripts

| Command | Purpose |
|---|---|
| `corepack pnpm dev` | Run server + web locally together (one command, prefixed logs) |
| `corepack pnpm run verify` | Full local gate: typecheck, lint, all suites, build |
| `corepack pnpm run verify:fast` | Typecheck, lint, and unit tests for quick iteration |
| `corepack pnpm run verify:simulation` | Simulation, contracts, orders, determinism, architecture, invariants |
| `corepack pnpm run verify:browser` | Build and run the Chromium + Firefox E2E gate |
| `corepack pnpm run test:e2e:all` | Explicitly scoped full Chromium + Firefox E2E gate (serial workers) |
| `corepack pnpm run test:e2e:focused <file>` | Run one E2E target; use `--list` first to confirm test count |
| `corepack pnpm run test:e2e -- --project=<browser>` | Explicitly scoped E2E gate for one browser |
| `corepack pnpm run typecheck` | `tsc --noEmit` across all packages |
| `corepack pnpm run lint` / `lint:fix` | Biome check / check + fix |
| `corepack pnpm run test:*` | unit, integration, simulation, contracts, orders, determinism, invariants, architecture, e2e |
| `corepack pnpm run build` | Topological build of all packages + Vite |
| `corepack pnpm run replay -- <file>` | Reproduce / validate a replay |
| `corepack pnpm run simulate -- --games 1000` | Headless matches |
| `corepack pnpm run fuzz` | Fuzzing; failures save a reproducible replay |
| `corepack pnpm run balance -- --games 1000` | Matchup statistics |
| `corepack pnpm run benchmark` | Simulation / renderer benchmarks |

## Release flow

Conventional commits (enforced by commitlint) drive **semantic-release** on
`main` pushes: version bump, `CHANGELOG`, and a GitHub release (`chore(release):
X [skip ci]`). Husky gates commits (lint-staged + ≤10 files), and `pnpm
install` enforces a `minimumReleaseAge` supply-chain guard. PRs follow
`.github/PULL_REQUEST_TEMPLATE.md` and record the opencode session id for
resumability.

## Verification philosophy

Tests prove behavior — invariants, determinism, integration, and regressions — not coverage. Two simulations with the same seed must produce identical hashes at every tick; any fuzz failure is saved as a seed + commands + replay that reproduces the bug deterministically. Every fixed bug becomes a permanent regression test.

A feature is **done** only when its acceptance criteria are demonstrated by objective validation, per the Definition of Done. See `docs/master-plan.md` and `docs/references/definition-of-done.md`.

## Documentation

- `docs/engineering-standard.md` — engineering source of truth: modules, cohesion,
  naming, typing, math clarity, testing, determinism, Definition of Done, self-audit.
- `docs/architecture.md` — current module layout, package boundaries, shared concepts.
- `docs/master-plan.md` — architecture, contracts, phases, acceptance criteria, risks.
- `docs/simulation.md` — the deterministic simulation core: pipeline order, components, events, victory.
- `docs/commands.md` — the authoritative command contract (MOVE, orders, combat, surrender).
- `docs/assets/capabilities.md` — asset inventory and integration/polish possibilities.
- `docs/specs/` — capability map and per-module specs.
- `docs/adr/` — architectural decisions (Context / Decision / Alternatives / Consequences / Evidence).
- `docs/postmortems/` — every bug is closed with a postmortem + permanent regression test.
- `docs/testing/manual-smoke.md` — what is implemented, how to test it yourself, expected results.
- `docs/ai/STACKED-PR-WORKFLOW.md` — branch, stacked PR, rebase, and toolchain workflow.

## Status

Phase 0 (foundation + spikes) **complete** (gate 9/9): deterministic core, ECS,
fixed-timestep engine (20 t/s), canonical hashing, snapshot/restore, minimal
replay, validated MOVE with formation, authoritative session, PixiJS renderer
with selection/ping, benchmark + Node≡Chromium determinism, 13 ADRs, 6
postmortems. Quality pipeline: husky + commitlint + lint-staged + biome +
minimumReleaseAge + semantic-release.

Phase 1 (simulation core) **complete**: frozen systems pipeline with per-tick
events, full command contracts + atomicity, order queue (STOP/HOLD/PATROL),
players/wallet + surrender, instant combat (ATTACK/ATTACK_MOVE/HOLD auto-attack)
with simultaneous death, victory/draw/tick-limit, central invariants, expanded
determinism. The visual track delivers a hostile demo where factions march from
their corners and fight, with overhead HP bars, attack streaks, damage popups,
death explosions, and attack animations. The client issues the full command set
(command bar + contextual right-click), shows a Victory/Defeat/Draw overlay, and
switches demo scenarios (2v2, 4v4, melee-vs-ranged, free-for-all, win/defeat).
Next: Phase 2 (economy and production). See `docs/tasks/todo.md`.
