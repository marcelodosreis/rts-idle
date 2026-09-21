# Implementation Plan: VS-01 Economy v0

## Overview

Add one deterministic, server-authoritative simulation loop: an owned pawn
worker receives `GATHER`, walks to a mineral node, gathers into canonical cargo,
walks to the nearest valid owned Base, deposits into the existing player wallet,
and repeats while minerals remain. The implementation stays inside the current
ECS/command/system architecture and deliberately excludes UI, pathfinding,
construction, production, supply, and generalized resource abstractions.

Task packet: `docs/tasks/VS-01.md`.

## Architecture Decisions

1. **Use existing domain vocabulary with the smallest compatibility surface.**
   `Kind: 'pawn'` is the Worker. `PlayerState.gold` is the Economy v0 mineral
   balance; it remains named `gold` to avoid a protocol/renderer migration that
   adds no gameplay value.
2. **Represent durable economy state in ECS.** Add `MineralNode { remaining }`,
   marker `Base`, and `Cargo { amount, capacity }` components. Extend canonical
   `Order` with `GATHER { nodeId, phase, progressTicks }`; the order records the
   worker's resumable activity while `Movement` remains the existing
   route-to-destination state.
3. **Use one `GATHER` command.** The command validates the whole worker
   selection and target before mutation, replaces current orders, and sends all
   workers to the node position. The generic server command path already
   schedules shared `CommandIntent`, so no client or server gameplay branch is
   required beyond the shared intent and protocol guard.
4. **Run economy after movement and before combat.** Existing system relative
   order is preserved: `orders → movement → economy → combat → death → victory
   → invariants`. This matches ADR-013's reserved gather/deposit slot and lets a
   worker act on the tick it arrives.
5. **Deterministic rules use explicit ordering.** Workers and entities are
   visited by ascending entity ID. Only the lowest-ID eligible worker progresses
   on a node each tick. A return Base is chosen by squared distance, then entity
   ID. No RNG, floating-point time, pathfinding, or wall clock is involved.
6. **Use approved Economy baselines.** Cargo capacity is 10; one mineral is
   transferred after 20 uncontested gather ticks; fixture nodes start with
   3,000 minerals. Transfers use `min(1, remaining, free capacity)` so resource
   conservation and non-negative balances are structural.
7. **Treat this as a canonical-schema evolution.** Register the three new
   components after the existing seven, add the `GATHER` order tag, bump the
   simulation version, and intentionally regenerate the pinned golden bytes/hash.
   `serializeState` itself needs no special case because it already walks the
   registered component schema.

## Dependency Graph

```text
canonical ECS components + order encoding
              ↓
shared/protocol GATHER intent + atomic command handler
              ↓
movement → economy pipeline loop + invariants
              ↓
snapshot/restore + replay/hash verification
              ↓
repository completion gate
```

## Task List

### Phase 1 — Canonical economy state

- [x] **T1 — Add canonical economy components and order state (M, 5 files).**
  - Acceptance: `MineralNode`, `Base`, and `Cargo` are registered after existing
    components; `GATHER` order phase/progress round-trips canonically; invalid
    decoded tags/values are rejected; simulation version records the schema
    change.
  - TDD: first add focused component/order round-trip and lifecycle assertions.
  - Files: `packages/simulation/src/ecs/components.ts`,
    `packages/simulation/src/ecs/create-world.ts`,
    `packages/simulation/src/contracts/orders.ts`,
    `packages/simulation/src/contracts/simulation-version.ts`,
    `tests/unit/economy-components.test.ts`.
  - Verify: `pnpm vitest run tests/unit/economy-components.test.ts` and
    `pnpm run typecheck`.

### Phase 2 — Authoritative command boundary

- [x] **T2 — Add and atomically apply `GATHER` (M, 5 files).**
  - Acceptance: the shared intent and wire guard accept only integer worker/node
    IDs; the simulation rejects foreign, non-worker, missing, or non-node
    selections without partial mutation; a valid command replaces prior work
    and starts movement toward the node.
  - TDD: add contract/atomicity cases before the handler.
  - Files: `packages/shared/src/commands.ts`,
    `packages/protocol/src/messages/command.ts`,
    `packages/simulation/src/commands/gather.ts`,
    `packages/simulation/src/commands/apply-command.ts`,
    `tests/contracts/economy-command.test.ts`.
  - Verify: `pnpm vitest run tests/contracts/economy-command.test.ts` and
    `pnpm run test:contracts`.

### Checkpoint — State and command contract

- [x] Component/order serialization tests pass.
- [x] Valid and invalid `GATHER` commands preserve atomicity.
- [x] Typecheck and lint pass for the new contract surface.

### Phase 3 — Vertical gameplay loop

- [x] **T3 — Implement gather, carry, return, and deposit (M, 4 files).**
  - Acceptance: a commanded worker completes the full automatic loop; wallet
    changes only on deposit; node + cargo + wallet conserve minerals; same-node
    contention and Base choice follow deterministic ID/distance tie-breaks.
  - TDD: write focused simulation scenarios before the economy system.
  - Files: `packages/simulation/src/systems/economy-system.ts`,
    `packages/simulation/src/systems/pipeline.ts`,
    `packages/simulation/src/invariants/check-invariants.ts`,
    `tests/simulation/economy-v0.test.ts`.
  - Verify: `pnpm vitest run tests/simulation/economy-v0.test.ts` and
    `pnpm run test:simulation`.

- [x] **T4 — Cover interruption and edge-state behavior (S, 2 files).**
  - Acceptance: node exhaustion never creates negative resources; a worker with
    cargo waits when no owned Base exists and resumes when one is valid; worker
    death removes cargo through ECS lifecycle; replacing the order does not
    deposit carried minerals.
  - Files: `tests/simulation/economy-v0.test.ts`,
    `packages/simulation/src/systems/economy-system.ts`.
  - Verify: `pnpm vitest run tests/simulation/economy-v0.test.ts` and
    `pnpm run test:invariants`.

### Checkpoint — Playable simulation slice

- [x] The Worker → Node → Gather → Carry → Base → Deposit path passes.
- [x] Conservation, contention, interruption, and invariant cases pass.
- [x] `pnpm run typecheck`, `pnpm run lint`, `pnpm run test:simulation`, and
  `pnpm run test:contracts` pass.

### Phase 4 — Persistence and determinism

- [x] **T5 — Pin snapshot, hash, and replay behavior (M, 4 files).**
  - Acceptance: snapshots taken while travelling, gathering, carrying, and
    returning restore the exact economy state and continue identically; equal
    seed + command streams hash equally; changed node/cargo/wallet state changes
    the hash; the intentional canonical golden/version update is explicit.
  - Files: `tests/simulation/snapshot-roundtrip.test.ts`,
    `tests/determinism/core-replay.test.ts`,
    `tests/simulation/hash-golden.test.ts`,
    `packages/simulation/src/contracts/simulation-version.ts`.
  - Verify: `pnpm run test:determinism` and `pnpm run test:simulation`.

- [x] **T6 — Update public contracts and operational documentation (M, 5 files).**
  - Acceptance: public API assertions include economy components/types; command
    and simulation docs describe Economy v0; task status matches reality.
  - Files: `tests/architecture/public-api.test.ts`, `docs/commands.md`,
    `docs/simulation.md`, `docs/tasks/todo.md`.
  - Verify: `pnpm run test:architecture` and documentation self-audit.

### Checkpoint — Completion

- [x] Focused economy, contract, simulation, determinism, invariant, and
  architecture checks pass.
- [x] `pnpm run verify` passes.
- [x] Browser E2E passes through the explicit Chromium gate.
- [x] Changed files pass the engineering-standard self-audit.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Canonical component/order additions invalidate pinned bytes | High | Version bump and explicit golden update only after round-trip/replay tests pass |
| Economy order fights existing movement/combat orders | High | `GATHER` replaces the queue atomically; other replacing commands cancel the loop but leave cargo intact |
| Multiple workers create minerals from one node | High | Ascending-ID arbitration and conservation assertions over node + cargo + wallet |
| Base/node disappears mid-loop | Medium | Revalidate references every economy tick; return/wait with cargo, clear empty invalid jobs |
| No pathfinding means “accessible” cannot be modeled | Low | Any valid owned Base is reachable by current straight-line movement; path accessibility remains a non-goal |
| `gold` name differs from “minerals” | Low | Document it as the v0 mineral wallet and avoid a cross-package rename unrelated to gameplay |

## Parallelization

None. These tasks share canonical contracts and must remain sequential. Tests
are written first within each slice, then the smallest implementation makes
them pass.

## Approved Review Points

- Retain `PlayerState.gold` as the v0 mineral balance.
- Use the 20-tick-per-mineral baseline and automatic repeat behavior.
- Use Movement → Economy with a deliberate schema/version/golden update.
