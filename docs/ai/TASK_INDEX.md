# Task Index

> Compact index of work. Each task is a small, verifiable unit.
> Full details in task packets. Status: pending / in-progress / done.
> Completed packets are archived in `docs/tasks/done/`; active packets remain in `docs/tasks/`.

## Phase 2 — Economy and Production

## Concept Authority

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|--------------|----------|------------|
| ARCH.03.01 | Bootstrap consolidation | done | — | protocol, server | contracts, integration |
| ARCH.03.02 | Match bootstrap lifecycle | done | ARCH.03.01 | protocol, server | contracts, integration |
| ARCH.03.03 | Single normalized map | done | ARCH.03.02 | server, simulation, web | integration, simulation, e2e |
| ARCH.03.04 | Web dependency authority | done | ARCH.03.03 | web, renderer | architecture |
| ARCH.03.05 | Configured HUD catalogs | done | ARCH.03.04 | protocol, server, web | e2e |
| ARCH.03.06 | Snapshot building projection | done | ARCH.03.05 | protocol, renderer, web | unit |
| ARCH.03.07 | Command admission | done | — | simulation | simulation, orders |
| ARCH.03.08 | Movement destination authority | done | ARCH.03.07 | simulation | simulation, orders, determinism |
| ARCH.03.09 | Order queue authority | done | ARCH.03.08 | simulation | simulation, orders, determinism |
| ARCH.03.10 | Deterministic predicates | done | ARCH.03.09 | simulation | simulation, determinism |
| ARCH.03.11 | Coordinate authority | done | — | shared, renderer | unit |
| ARCH.03.12 | Visual timing and health authority | done | ARCH.03.11 | renderer, web | unit |
| ARCH.03.13 | Metrics locality decision | done | ARCH.03.12 | docs | lint |
| ARCH.03.14 | Legacy authority removal | done | ARCH.03.10 | protocol, simulation | contracts, simulation, architecture |
| ARCH.03.15 | Authority closure audit | done | ARCH.03.01–14 | docs, quality | verify, browser |

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| P2.01.01 | Resource node component | done | — | simulation | unit, simulation |
| P2.01.02 | Wallet system (mineral tracking) | done | P2.01.01 | simulation | unit, simulation |
| P2.01.03 | Worker gather command | done | P2.01.01 | simulation | unit, simulation, integration |
| P2.02.01 | Cargo system (gather + deposit) | done | P2.01.02, P2.01.03 | simulation | unit, simulation |
| P2.02.02 | Base building (deposit point) | done | P2.02.01 | simulation, game-data | unit, simulation |
| P2.02.03 | Playable economy integration | done | P2.01.03, P2.02.01, P2.02.02 | protocol, server, renderer, web | unit, integration, e2e |
| P2.02.04 | Manual cargo deposit command | done | P2.02.01, P2.02.02 | shared, protocol, simulation, server, renderer, web | unit, simulation, contracts, invariants, integration, e2e |
| P2.03.01 | Building placement system | done | — | simulation | unit, invariants |
| P2.04.01 | Base construction | done | P2.03.01, P2.02.02 | simulation, game-data | unit, simulation |
| P2.04.02 | Barracks construction | done | P2.04.01 | simulation, game-data | unit, simulation |
| P2.06.01 | Supply depot construction | done | P2.04.01 | simulation, game-data, protocol, web | unit, simulation, contracts, e2e |
| P2.05.01 | Construction cancellation | done | P2.04.01 | shared, protocol, simulation, web | unit, simulation, contracts, invariants, e2e |
| P2.07 | Production queue and unit training: Pawn, Warrior, Archer | done | P2.04.02, P2.06.01 | shared, game-data, protocol, simulation, web | unit, simulation, contracts, determinism, invariants, e2e |
| P2.08 | Blocked spawn and rally | done | P2.07 | shared, protocol, simulation, renderer, server, web | unit, simulation, contracts, determinism, invariants, e2e |
| P2.09 | Rally shortcut and producer feedback | done | P2.08 | renderer, web | unit, e2e |
| P2.09.01 | Producer cancellation and producer cleanup | done | P2.07, P2.08 | shared, protocol, simulation, server, web | unit, simulation, contracts, integration, determinism, invariants, e2e |
| P2.06.02 | Supply cap system | done | P2.06.01 | simulation | unit, simulation |
| P2.01.04 | Resource display in HUD | done | P2.01.02 | web | e2e |
| P2.01.05 | Worker gather/carry feedback | done | P2.01.03, P2.02.01 | protocol, server, renderer, web | unit, integration, e2e |
| P2.02.05 | Carrying state without a gather order | done | P2.02.01, P2.02.04 | protocol, renderer, web | unit, integration, e2e |
| P2.03.02 | Build menu | done | P2.03.01 | web | e2e |
| P2.07.05 | Production panel: Pawn, Warrior, Archer | done | P2.07 | web | e2e |
| P2.10.01 | Persistent unit health bars | done | P2.07 | renderer, web | unit, e2e |
| P2.10.02 | Building health and shared damage | done | P2.10.01 | game-data, simulation, protocol, renderer, server, web | unit, simulation, contracts, integration, e2e |
| P2.10 | Repair | done | P2.10.02 | shared, game-data, protocol, simulation, server, renderer, web | unit, simulation, contracts, integration, determinism, invariants, e2e |
| P2.11 | Research and modifiers | done | P2.07, P2.10 | shared, game-data, protocol, simulation, server, renderer, web | unit, simulation, contracts, determinism, invariants, e2e |
| P2.11.01 | Monk Heal | done | P2.11 | shared, game-data, protocol, simulation, server, renderer, web | unit, simulation, contracts, determinism, invariants, e2e |
| P2.12 | Economic integration | pending | P2.11 | simulation, server, web | integration, determinism, e2e |

## Phase 3 — Navigation and Combat

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| P3.01.01 | Navigation grid | pending | — | pathfinding | unit |
| P3.01.02 | A* pathfinding | pending | P3.01.01 | pathfinding | unit, simulation |
| P3.03.01 | Collision detection | pending | P3.01.01 | simulation | unit, simulation |
| P3.04.01 | Group movement | pending | P3.01.02, P3.03.01 | simulation | unit, simulation |
| P3.07.01 | Vision system | pending | P3.01.01 | simulation | unit, simulation |
| P3.08.01 | Filtered snapshots | pending | P3.07.01 | simulation, protocol | unit, simulation |
| P3.08.02 | Fog rendering | pending | P3.08.01 | renderer | e2e |
| P3.10.01 | Projectile system | pending | P3.01.02 | simulation | unit, simulation |
| P3.11.01 | AoE damage | pending | P3.10.01 | simulation | unit, simulation |

## Phase 4A — M1 Content

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| P4A.01 | Faction definitions | pending | — | game-data | unit |
| P4A.02 | Vanguard unit roster | pending | P4A.01 | game-data, simulation | unit, simulation |
| P4A.03 | Nexus unit roster | pending | P4A.01 | game-data, simulation | unit, simulation |
| P4A.04 | Building definitions | pending | P4A.01 | game-data | unit |
| P4A.05 | Map 192x192 | pending | P4A.01 | game-data | unit |

## Phase 5 — AI

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| P5.01 | Agent contract | pending | — | ai | unit |
| P5.02 | Strategic layer (economy) | pending | P5.01, P2.02.01 | ai | unit, simulation |
| P5.03 | Tactical layer (combat) | pending | P5.01 | ai | unit, simulation |
| P5.04 | Bot runner | pending | P5.02, P5.03 | ai, server | integration |

## Phase 6 — Multiplayer

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| P6.01 | Room lifecycle | pending | — | server, protocol | integration |
| P6.02 | Player assignment | pending | P6.01 | server | integration |
| P6.03 | Synchronized start | pending | P6.02 | server | integration |
| P6.04 | Command sequencing | pending | P6.01 | protocol, server | integration |
| P6.05 | Reconnection | pending | P6.04 | server, web | e2e |

## Level Editor Initiative

Spec: `docs/specs/SPEC-level-editor.md`. Completed plan: `docs/tasks/done/level-editor-plan.md`.

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| ED.01.01 | Map contract (DressingKind + decorations) | done | — | game-data, renderer | unit, architecture |
| ED.01.02 | Lossless terrain/stairs conversion | done | ED.01.01 | renderer | unit |
| ED.01.03 | Game render parity (elevated/stairs/decorations) | done | ED.01.02 | renderer | unit, e2e |
| ED.02.01 | Grid overlay, cell highlight, single-hit detection | done | ED.01.03 | web | e2e |
| ED.02.02 | Status bar cursor coordinates + border feedback | done | ED.02.01 | web | e2e |
| ED.03.01 | Decoration palette + place/remove tools | done | ED.01.03, ED.02.01 | web | unit, e2e |
| ED.03.02 | TerrainScene explicit decoration items | done | ED.01.01 | renderer | unit |
| ED.03.03 | Decoration round-trip (lab + game format) | done | ED.03.01, ED.03.02 | web, renderer | unit, e2e |
| ED.04.01 | Playtest bridge (localStorage + ?map=local) | done | ED.01.03 | web | e2e |
| ED.04.02 | Playtest e2e coverage | done | ED.04.01 | web | e2e |
| ED.05.01 | Local autosave + restore | done | ED.01.01 | web | e2e |
| ED.05.02 | JSON download/upload + schema validation | done | ED.01.01 | web | unit, e2e |

## Web Platform

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| ARCH.01.01 | Web frontend architecture restructure | done | — | web | unit, integration, architecture, e2e |
| ARCH.01.02 | Unified world interaction | done | — | renderer, web | unit, e2e |

## Architecture Evolution (RFC-001)

RFC: `docs/rfc/RFC-001-technology-substitutability.md` (Proposed).

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| ARCH.02.01 | Renderer contract + debug separation | pending | — | renderer, web | unit, e2e |
| ARCH.02.02 | Transport port + WebSocket adapter | pending | — | web | e2e |
| ARCH.02.03 | PlatformServices + BrowserPlatform | pending | — | web | e2e |
| ARCH.02.04 | `PlayerObservation` in simulation | pending | — | simulation | unit, simulation |
| ARCH.02.05 | Authority × projection in server | pending | ARCH.02.04 | server, simulation, protocol | integration, architecture, e2e |
| ARCH.02.06 | Content/scenarios out of server | pending | ARCH.02.05 | game-data, simulation, server | integration, architecture |

## Deployment (RFC-002)

RFC: `docs/rfc/RFC-002-deployment-and-environments.md` (Proposed).
Target: Render Hobby (free), Docker same-origin monolith, `staging` + `main`.

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| DEP.01 | Same-origin WebSocket URL in client | pending | — | web | unit, e2e |
| DEP.02 | Server static serving + MPA routes + cache headers | pending | — | server | integration, e2e |
| DEP.03 | Server hardening: SIGTERM, WS_ORIGIN, connection cap, backpressure | pending | — | server | unit, integration |
| DEP.04 | Multi-stage Dockerfile + `.dockerignore` + local smoke | pending | DEP.02 | root | docker build/run |
| DEP.05 | `render.yaml` Blueprint + `staging` branch | pending | DEP.04 | infra | blueprint validate, manual deploy |
| DEP.06 | Client reconnect/backoff + cold-start UX | pending | DEP.01 | web | e2e |
| DEP.07 | CI deploy gating + secrets | pending | DEP.05 | infra | end-to-end deploy |
| DEP.08 | Deployment docs + env docs | pending | DEP.05 | docs | review |
| DEP.09 | Snapshot bandwidth optimization (deferred) | pending | — | protocol, simulation, server | determinism, e2e |

## Cost & Scale (RFC-003)

RFC: `docs/rfc/RFC-003-cost-scale-and-architecture-comparison.md` (Proposed).

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| SCL.01 | Delta snapshots (protocol + server) | pending | — | protocol, simulation, server | determinism, integration |
| SCL.02 | Shared room system (matchmaking + rooms) | pending | — | server, protocol | integration, e2e |
| SCL.03 | Binary protocol (MessagePack) | pending | SCL.01 | protocol | unit, integration |
| SCL.04 | Fog of war (filtered snapshots) | pending | SCL.02 | simulation, protocol | unit, simulation |

## Validation Levels

| Level | When | Commands |
|-------|------|----------|
| unit | Iteration | `pnpm run test:unit` |
| simulation | Iteration (if simulation) | `pnpm run test:simulation` |
| integration | Per-feature | `pnpm run test:integration` |
| contracts | Per-feature | `pnpm run test:contracts` |
| orders | Per-feature (if orders) | `pnpm run test:orders` |
| determinism | Iteration when simulation/determinism is affected | `pnpm run test:determinism` |
| architecture | Completion (included in verify) | `pnpm run test:architecture` |
| e2e | Browser/protocol completion or CI | focused target with `--list`; full gate only when required |
| verify | Completion | `pnpm run verify` |

## Browser Validation

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|--------------|----------|------------|
| QH.25 | E2E gate stratification | done | - | web, renderer, quality | e2e, verify |

## Quality Hardening

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|--------------|----------|------------|
| QH.00 | Spec + ADR | pending | — | docs | lint |
| QH.01 | Structural harness | pending | QH.00 | quality | unit |
| QH.02 | HUD contract | pending | QH.01 | web, quality | unit, e2e |
| QH.03 | Display list invariants | pending | QH.01 | renderer, quality | unit |
| QH.04 | Input helper | pending | QH.00 | web, quality | unit |
| QH.05 | Gesture matrix | pending | QH.04 | web, quality | e2e |
| QH.06 | WebKit/touch | pending | QH.05 | web, quality | e2e |
| QH.07 | Barrier input | pending | QH.04 | web, quality | unit |
| QH.08 | Dynamic geometry | pending | QH.02 | renderer, quality | unit |
| QH.09 | Concurrent isolation | pending | QH.00 | quality | integration |
| QH.10 | Barrier singleton | pending | QH.00 | quality | unit |
| QH.11 | Toggle CI parallelism | pending | QH.09, QH.10 | quality, infra | CI |
| QH.12 | expectAnim + barrier | pending | QH.00 | quality | unit, e2e |
| QH.13 | Path-based E2E gate | pending | QH.02, QH.05 | quality, CI | e2e |
| QH.14 | Coverage ratchet | pending | QH.16 | quality | unit |
| QH.15 | Branch baseline | pending | — | quality, CI | CI |
| QH.16 | Output hygiene | done | — | quality, CI | unit, verify, e2e |
| QH.17 | Postmortem tracking | done | — | quality, docs | unit |
| QH.18 | Board and tracking guard | done | QH.17 | quality, docs | unit |
| QH.19 | Clean code, SOLID, and strong-typing baseline | done | — | docs, shared, game-data, protocol, simulation, renderer, server | typecheck, lint, architecture, verify |
| QH.20 | Web app function decomposition (React ≤50 lines) | done | QH.19 | web | lint, unit, e2e |
| QH.21 | Typed-domain completion (registries + branded AssetKey) | done | QH.19 | shared, protocol, renderer, server, web | typecheck, lint, architecture |
| QH.22 | Public API and docs sync | done | QH.19, QH.21 | docs, tests | architecture, lint |
| QH.23 | Session projections and tools coverage | done | QH.19 | server, tools, tests | integration, lint, architecture |
| QH.26.01 | Deterministic CI and E2E reliability | done | QH.25 | quality, CI, web | verify, e2e, CI |
| QH.24 | Mandatory enforcement (git, CI, governance) | done | QH.19 | root, docs, rules, skills, tests | lint, architecture, verify |
