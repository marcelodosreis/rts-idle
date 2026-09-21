# Capability Map: Browser RTS

Approved during the planning session. This is the module index; the detailed specification of each module lives in `SPEC-<module-id>.md`.

| Module id | Responsibility | Depends on |
|---|---|---|
| `foundation` | Workspace, build, tests, CI, and import boundaries | — |
| `game-data` | Definitions, map, and content validation | `foundation` |
| `pathfinding` | Deterministic navigation and spatial queries | `foundation` |
| `simulation` | State, ECS, commands, systems, vision, and outcome | `game-data`, `pathfinding` |
| `protocol` | Versioned messages and public DTOs | `foundation` |
| `ai` | Limited observation and decisions via commands | Public contracts of `simulation` |
| `session-server` | Rooms, authority, transport, and reconnect | `simulation`, `protocol`, `ai` |
| `replay-tooling` | Reproduction, hashes, fuzz, self-play, and benchmarks | `simulation`; `ai` for self-play |
| `browser-client` | Filtered replica, input, PixiJS, HUD, and audio | `protocol`, visual catalog of `game-data` |

Build order: `foundation` → `game-data`, `pathfinding`, `protocol` → `simulation` → `ai` → `session-server`, `replay-tooling` → `browser-client`.

## Interface boundaries

- `simulation` depends on `game-data` and `pathfinding`; the contract between them lives in `SPEC-simulation.md`.
- `ai` depends on the public contracts of `simulation`; the contract lives in `SPEC-simulation.md` (observation) and `SPEC-ai.md`.
- `browser-client` depends on `protocol` for wire DTOs and on `game-data` for the visual catalog.

## Execution model

Each module runs Spec → Plan → Tasks → Implement in dependency order, per `SPEC-<module-id>.md` and `docs/tasks/plan.md`.
