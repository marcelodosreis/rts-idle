# Task Index

> Compact index of work. Each task is a small, verifiable unit.
> Full details in task packets. Status: pending / in-progress / done.
> Completed packets are archived in `docs/tasks/done/`; active packets remain in `docs/tasks/`.

## Phase 2 — Economy and Production

## Concept Authority

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|--------------|----------|------------|
| AUTH-005A | Bootstrap consolidation | done | — | protocol, server | contracts, integration |
| AUTH-005 | Match bootstrap lifecycle | done | AUTH-005A | protocol, server | contracts, integration |
| AUTH-006 | Single normalized map | done | AUTH-005 | server, simulation, web | integration, simulation, e2e |
| AUTH-007 | Web dependency authority | done | AUTH-006 | web, renderer | architecture |
| AUTH-008 | Configured HUD catalogs | done | AUTH-007 | protocol, server, web | e2e |
| AUTH-009 | Snapshot building projection | done | AUTH-008 | protocol, renderer, web | unit |
| AUTH-010 | Command admission | done | — | simulation | simulation, orders |
| AUTH-011 | Movement destination authority | done | AUTH-010 | simulation | simulation, orders, determinism |
| AUTH-012 | Order queue authority | done | AUTH-011 | simulation | simulation, orders, determinism |
| AUTH-013 | Deterministic predicates | done | AUTH-012 | simulation | simulation, determinism |
| AUTH-014 | Coordinate authority | done | — | shared, renderer | unit |
| AUTH-015 | Visual timing and health authority | done | AUTH-014 | renderer, web | unit |
| AUTH-016 | Metrics locality decision | done | AUTH-015 | docs | lint |
| AUTH-017 | Legacy authority removal | done | AUTH-013 | protocol, simulation | contracts, simulation, architecture |
| AUTH-018 | Authority closure audit | done | AUTH-005–017 | docs, quality | verify, browser |

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| ECONOMY-001 | Resource node component | done | — | simulation | unit, simulation |
| ECONOMY-002 | Wallet system (mineral tracking) | done | ECONOMY-001 | simulation | unit, simulation |
| ECONOMY-003 | Worker gather command | done | ECONOMY-001 | simulation | unit, simulation, integration |
| ECONOMY-004 | Cargo system (gather + deposit) | done | ECONOMY-002, ECONOMY-003 | simulation | unit, simulation |
| ECONOMY-005 | Base building (deposit point) | done | ECONOMY-004 | simulation, game-data | unit, simulation |
| VS-01B | Playable economy integration | done | ECONOMY-003, ECONOMY-004, ECONOMY-005 | protocol, server, renderer, web | unit, integration, e2e |
| BUILD-001 | Building placement system | done | — | simulation | unit, invariants |
| BUILD-002 | Base construction | done | BUILD-001, ECONOMY-005 | simulation, game-data | unit, simulation |
| BUILD-003 | Barracks construction | done | BUILD-002 | simulation, game-data | unit, simulation |
| BUILD-004 | Supply depot construction | done | BUILD-002 | simulation, game-data, protocol, web | unit, simulation, contracts, e2e |
| PROD-001 | Production queue component | pending | — | simulation | unit, simulation |
| PROD-002 | Unit training system | pending | PROD-001, BUILD-003 | simulation | unit, simulation |
| PROD-003 | Supply cap system | done | BUILD-004 | simulation | unit, simulation |
| ECONOMY-UI-001 | Resource display in HUD | done | ECONOMY-002 | web | e2e |
| ECONOMY-UI-004 | Worker gather/carry feedback | done | ECONOMY-003, ECONOMY-004 | protocol, server, renderer, web | unit, integration, e2e |
| ECONOMY-UI-002 | Build menu | pending | BUILD-001 | web | e2e |
| ECONOMY-UI-003 | Production panel | pending | PROD-001 | web | e2e |

## Phase 3 — Navigation and Combat

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| NAV-001 | Navigation grid | pending | — | pathfinding | unit |
| NAV-002 | A* pathfinding | pending | NAV-001 | pathfinding | unit, simulation |
| NAV-003 | Collision detection | pending | NAV-001 | simulation | unit, simulation |
| NAV-004 | Group movement | pending | NAV-002, NAV-003 | simulation | unit, simulation |
| FOW-001 | Vision system | pending | NAV-001 | simulation | unit, simulation |
| FOW-002 | Filtered snapshots | pending | FOW-001 | simulation, protocol | unit, simulation |
| FOW-003 | Fog rendering | pending | FOW-002 | renderer | e2e |
| COMBAT-001 | Projectile system | pending | NAV-002 | simulation | unit, simulation |
| COMBAT-002 | AoE damage | pending | COMBAT-001 | simulation | unit, simulation |

## Phase 4A — M1 Content

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| CONTENT-001 | Faction definitions | pending | — | game-data | unit |
| CONTENT-002 | Vanguard unit roster | pending | CONTENT-001 | game-data, simulation | unit, simulation |
| CONTENT-003 | Nexus unit roster | pending | CONTENT-001 | game-data, simulation | unit, simulation |
| CONTENT-004 | Building definitions | pending | CONTENT-001 | game-data | unit |
| CONTENT-005 | Map 192x192 | pending | CONTENT-001 | game-data | unit |

## Phase 5 — AI

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| AI-001 | Agent contract | pending | — | ai | unit |
| AI-002 | Strategic layer (economy) | pending | AI-001, ECONOMY-004 | ai | unit, simulation |
| AI-003 | Tactical layer (combat) | pending | AI-001 | ai | unit, simulation |
| AI-004 | Bot runner | pending | AI-002, AI-003 | ai, server | integration |

## Phase 6 — Multiplayer

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| ROOM-001 | Room lifecycle | pending | — | server, protocol | integration |
| ROOM-002 | Player assignment | pending | ROOM-001 | server | integration |
| ROOM-003 | Synchronized start | pending | ROOM-002 | server | integration |
| NET-001 | Command sequencing | pending | ROOM-001 | protocol, server | integration |
| NET-002 | Reconnection | pending | NET-001 | server, web | e2e |

## Level Editor Initiative

Spec: `docs/specs/SPEC-level-editor.md`. Completed plan: `docs/tasks/done/level-editor-plan.md`.

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| EDITOR-001 | Map contract (DressingKind + decorations) | done | — | game-data, renderer | unit, architecture |
| EDITOR-002 | Lossless terrain/stairs conversion | done | EDITOR-001 | renderer | unit |
| EDITOR-003 | Game render parity (elevated/stairs/decorations) | done | EDITOR-002 | renderer | unit, e2e |
| EDITOR-010 | Grid overlay, cell highlight, single-hit detection | done | EDITOR-003 | web | e2e |
| EDITOR-011 | Status bar cursor coordinates + border feedback | done | EDITOR-010 | web | e2e |
| EDITOR-020 | Decoration palette + place/remove tools | done | EDITOR-003, EDITOR-010 | web | unit, e2e |
| EDITOR-021 | TerrainScene explicit decoration items | done | EDITOR-001 | renderer | unit |
| EDITOR-022 | Decoration round-trip (lab + game format) | done | EDITOR-020, EDITOR-021 | web, renderer | unit, e2e |
| EDITOR-030 | Playtest bridge (localStorage + ?map=local) | done | EDITOR-003 | web | e2e |
| EDITOR-031 | Playtest e2e coverage | done | EDITOR-030 | web | e2e |
| EDITOR-040 | Local autosave + restore | done | EDITOR-001 | web | e2e |
| EDITOR-041 | JSON download/upload + schema validation | done | EDITOR-001 | web | unit, e2e |

## Architecture Evolution (RFC-001)

RFC: `docs/rfc/RFC-001-technology-substitutability.md` (Proposed).

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| RFC-001-PR1 | Renderer contract + debug separation | pending | — | renderer, web | unit, e2e |
| RFC-001-PR2 | Transport port + WebSocket adapter | pending | — | web | e2e |
| RFC-001-PR3 | PlatformServices + BrowserPlatform | pending | — | web | e2e |
| RFC-001-PR4 | `PlayerObservation` in simulation | pending | — | simulation | unit, simulation |
| RFC-001-PR5 | Authority × projection in server | pending | RFC-001-PR4 | server, simulation, protocol | integration, architecture, e2e |
| RFC-001-PR6 | Content/scenarios out of server | pending | RFC-001-PR5 | game-data, simulation, server | integration, architecture |

## Deployment (RFC-002)

RFC: `docs/rfc/RFC-002-deployment-and-environments.md` (Proposed).
Target: Render Hobby (free), Docker same-origin monolith, `staging` + `main`.

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| DEPLOY-001 | Same-origin WebSocket URL in client | pending | — | web | unit, e2e |
| DEPLOY-002 | Server static serving + MPA routes + cache headers | pending | — | server | integration, e2e |
| DEPLOY-003 | Server hardening: SIGTERM, WS_ORIGIN, connection cap, backpressure | pending | — | server | unit, integration |
| DEPLOY-004 | Multi-stage Dockerfile + `.dockerignore` + local smoke | pending | DEPLOY-002 | root | docker build/run |
| DEPLOY-005 | `render.yaml` Blueprint + `staging` branch | pending | DEPLOY-004 | infra | blueprint validate, manual deploy |
| DEPLOY-006 | Client reconnect/backoff + cold-start UX | pending | DEPLOY-001 | web | e2e |
| DEPLOY-007 | CI deploy gating + secrets | pending | DEPLOY-005 | infra | end-to-end deploy |
| DEPLOY-008 | Deployment docs + env docs | pending | DEPLOY-005 | docs | review |
| DEPLOY-009 | Snapshot bandwidth optimization (deferred) | pending | — | protocol, simulation, server | determinism, e2e |

## Cost & Scale (RFC-003)

RFC: `docs/rfc/RFC-003-cost-scale-and-architecture-comparison.md` (Proposed).

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| SCALE-001 | Delta snapshots (protocol + server) | pending | — | protocol, simulation, server | determinism, integration |
| SCALE-002 | Shared room system (matchmaking + rooms) | pending | — | server, protocol | integration, e2e |
| SCALE-003 | Binary protocol (MessagePack) | pending | SCALE-001 | protocol | unit, integration |
| SCALE-004 | Fog of war (filtered snapshots) | pending | SCALE-002 | simulation, protocol | unit, simulation |

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
