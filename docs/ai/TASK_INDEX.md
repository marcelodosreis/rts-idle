# Task Index

> Compact index of work. Each task is a small, verifiable unit.
> Full details in task packets. Status: pending / in-progress / done.

## Phase 2 — Economy and Production

| ID | Title | Status | Dependencies | Packages | Validation |
|----|-------|--------|-------------|----------|------------|
| ECONOMY-001 | Resource node component | pending | — | simulation | unit, simulation |
| ECONOMY-002 | Wallet system (mineral tracking) | pending | ECONOMY-001 | simulation | unit, simulation |
| ECONOMY-003 | Worker gather command | pending | ECONOMY-001 | simulation | unit, simulation, integration |
| ECONOMY-004 | Cargo system (gather + deposit) | pending | ECONOMY-002, ECONOMY-003 | simulation | unit, simulation |
| ECONOMY-005 | Base building (deposit point) | pending | ECONOMY-004 | simulation, game-data | unit, simulation |
| BUILD-001 | Building placement system | pending | — | simulation | unit, simulation |
| BUILD-002 | Base construction | pending | BUILD-001, ECONOMY-005 | simulation, game-data | unit, simulation |
| BUILD-003 | Barracks construction | pending | BUILD-002 | simulation, game-data | unit, simulation |
| BUILD-004 | Supply depot construction | pending | BUILD-002 | simulation, game-data | unit, simulation |
| PROD-001 | Production queue component | pending | — | simulation | unit, simulation |
| PROD-002 | Unit training system | pending | PROD-001, BUILD-003 | simulation | unit, simulation |
| PROD-003 | Supply cap system | pending | PROD-001, BUILD-004 | simulation | unit, simulation |
| ECONOMY-UI-001 | Resource display in HUD | pending | ECONOMY-002 | web | e2e |
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

## Validation Levels

| Level | When | Commands |
|-------|------|----------|
| unit | Per-task | `pnpm run test:unit` |
| simulation | Per-task (if simulation) | `pnpm run test:simulation` |
| integration | Per-feature | `pnpm run test:integration` |
| contracts | Per-feature | `pnpm run test:contracts` |
| orders | Per-feature (if orders) | `pnpm run test:orders` |
| determinism | Milestone | `pnpm run test:determinism` |
| architecture | Milestone | `pnpm run test:architecture` |
| e2e | Milestone | `pnpm run test:e2e` |
| verify | Release | `pnpm run verify` |
