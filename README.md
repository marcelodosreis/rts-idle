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
tests/        unit, integration, simulation, determinism, invariants, fuzz, regression, e2e, architecture
docs/         master-plan.md, specs/, adr/
```

Dependency direction is enforced and verified by tests: the simulation stays isolated from UI, transport, and platform packages.

## Getting started

Prerequisites: Node ≥ 24, pnpm ≥ 10.

```bash
pnpm install

pnpm run typecheck
pnpm run lint
pnpm run test:unit
pnpm run build

# Browser dev server (Vite)
pnpm --filter @rts/web dev
```

### E2E (Playwright)

```bash
pnpm exec playwright install chromium
pnpm run test:e2e
```

On WSL2/Linux, system libraries may be required (Playwright needs sudo; make sure the pnpm in your nvm PATH is visible to it):

```bash
sudo env "PATH=$PATH" pnpm exec playwright install-deps chromium
```

## Scripts

| Command | Purpose |
|---|---|
| `pnpm run typecheck` | `tsc --noEmit` across all packages |
| `pnpm run lint` / `lint:fix` | Biome check / check + fix |
| `pnpm run test:*` | unit, integration, simulation, determinism, invariants, regression, architecture, e2e |
| `pnpm run build` | Topological build of all packages + Vite |
| `pnpm run replay -- <file>` | Reproduce / validate a replay |
| `pnpm run simulate -- --games 1000` | Headless matches |
| `pnpm run fuzz` | Fuzzing; failures save a reproducible replay |
| `pnpm run balance -- --games 1000` | Matchup statistics |
| `pnpm run benchmark` | Simulation / renderer benchmarks |

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

- `docs/master-plan.md` — architecture, contracts, phases, acceptance criteria, risks.
- `docs/specs/` — capability map and per-module specs.
- `docs/adr/` — architectural decisions (Context / Decision / Alternatives / Consequences / Evidence).
- `docs/postmortems/` — every bug is closed with a postmortem + permanent regression test.
- `docs/testing/manual-smoke.md` — what is implemented, how to test it yourself, expected results.

## Status

Phase 0 (foundation + spikes) **complete** (gate 9/9): deterministic core, ECS,
fixed-timestep engine (20 t/s), canonical hashing, snapshot/restore, minimal
replay, validated MOVE with formation, authoritative session, PixiJS renderer
with selection/ping, benchmark + Node≡Chromium determinism, 13 ADRs, 6
postmortems. Quality pipeline: husky + commitlint + lint-staged + biome +
minimumReleaseAge + semantic-release. Next: Phase 1 (simulation core). See
`tasks/todo.md`.