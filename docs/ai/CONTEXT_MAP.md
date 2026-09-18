# Context Map

> "If I need to modify X, what is the minimum context I should read?"

Always start with `CURRENT_STATE.md`. Then read only what's relevant.

---

## Simulation Core

**Read:**
- `packages/simulation/src/engine/simulation.ts` (step function)
- `packages/simulation/src/state/state.ts` (GameState)
- `packages/simulation/src/systems/pipeline.ts` (system order)
- Relevant system file (e.g., `combat-system.ts`)
- `tests/simulation/` relevant test

**Additionally read (only if needed):**
- `docs/simulation.md` (if modifying system contracts)
- `docs/adr/ADR-013-system-order.md` (if changing pipeline)
- `docs/adr/ADR-001-isolated-deterministic-simulation.md` (if modifying boundaries)

**Do NOT read:**
- All ADRs
- Full master-plan.md
- Renderer/server code

---

## Commands

**Read:**
- `packages/shared/src/commands.ts` (CommandIntent union)
- `packages/simulation/src/commands/` (relevant command handler)
- `tests/contracts/command-schema.test.ts`
- `tests/contracts/command-atomicity.test.ts`

**Additionally read (only if needed):**
- `docs/commands.md` (if modifying command behavior)
- `packages/simulation/src/commands/validate-units.ts` (if modifying validation)

---

## ECS / Components

**Read:**
- `packages/simulation/src/ecs/components.ts` (component definitions)
- `packages/simulation/src/ecs/component-store.ts` (storage)
- `packages/simulation/src/ecs/world.ts` (entity management)
- `tests/unit/ecs-lifecycle.test.ts`

**Additionally read (only if needed):**
- `docs/adr/ADR-012-custom-ecs.md` (if modifying ECS design)

---

## Determinism / Hashing

**Read:**
- `packages/simulation/src/snapshot/serialize.ts`
- `packages/simulation/src/snapshot/hash.ts`
- `packages/shared/src/rng/` (RNG implementation)
- `tests/determinism/`
- `tests/simulation/hash-golden.test.ts`

**Additionally read (only if needed):**
- `docs/adr/ADR-002-determinism-primitives.md`
- `docs/determinism.md`

---

## Renderer

**Read:**
- `packages/renderer/src/renderer.ts` (main orchestrator)
- Relevant component (e.g., `unit-layer.ts`, `hp-bar.ts`)
- `tests/unit/` relevant test

**Additionally read (only if needed):**
- `packages/renderer/src/assets/` (if modifying asset loading)
- `tests/e2e/` relevant spec

**Do NOT read:**
- Simulation internals
- Server code

---

## Protocol / Networking

**Read:**
- `packages/protocol/src/messages/` (relevant message type)
- `packages/shared/src/commands.ts` (if command-related)
- `tests/unit/protocol-messages.test.ts`

**Additionally read (only if needed):**
- `docs/specs/SPEC-protocol.md` (if modifying wire format)
- `apps/server/src/sessions/session.ts` (if modifying server handling)

---

## Server

**Read:**
- `apps/server/src/main.ts` (entry point)
- `apps/server/src/sessions/session.ts` (session management)
- `apps/server/src/demo/scenarios.ts` (if modifying scenarios)

**Additionally read (only if needed):**
- `docs/specs/SPEC-session-server.md`
- `packages/simulation/src/engine/simulation-host.ts`

---

## Web App / HUD

**Read:**
- `apps/web/src/screens/MatchScreen.tsx` (main screen)
- Relevant HUD component (e.g., `TopBar.tsx`, `CommandBar.tsx`)
- `apps/web/src/screens/useMatchSession.ts` (match lifecycle)

**Additionally read (only if needed):**
- `packages/renderer/src/renderer.ts` (if modifying renderer integration)
- `tests/e2e/` relevant spec

---

## Game Data / Content

**Read:**
- `packages/game-data/src/maps/competitive.ts` (map definition)
- `packages/game-data/src/maps/types.ts` (types)
- `packages/simulation/src/data/unit-stats.ts` (unit stats)

**Additionally read (only if needed):**
- `docs/specs/SPEC-game-data.md` (if modifying content schema)
- `docs/master-plan.md §13-14` (if verifying planned content)

---

## Pathfinding (when implemented)

**Read:**
- `packages/pathfinding/src/` (all files — currently empty)
- `tests/unit/` pathfinding tests (when they exist)

**Additionally read (only if needed):**
- `docs/specs/SPEC-pathfinding.md`
- `docs/adr/` pathfinding ADR (when written)

---

## AI (when implemented)

**Read:**
- `packages/ai/src/` (all files — currently empty)
- Relevant test files

**Additionally read (only if needed):**
- `docs/specs/SPEC-ai.md`
- `packages/simulation/src/contracts/simulation.ts` (observation types)

---

## Architecture Tests

**Read:**
- `tests/architecture/package-dependencies.test.ts`
- `tests/architecture/simulation-isolation.test.ts`
- `tests/architecture/public-api.test.ts`

**Additionally read (only if needed):**
- `docs/architecture.md` (if modifying package boundaries)
- `docs/engineering-standard.md §2` (package organization)

---

## Documentation

**Read:**
- `docs/engineering-standard.md` (engineering source of truth)
- `docs/architecture.md` (current module layout)
- Relevant spec/ADR

**Additionally read (only if needed):**
- `docs/master-plan.md` (only for milestone-level planning)
- `docs/agent-ledger.md` (only for file claiming)
