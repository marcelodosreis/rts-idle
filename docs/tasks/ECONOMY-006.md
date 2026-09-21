# ECONOMY-006 — Manual cargo deposit and visible carrying state

## Task

- ID: `ECONOMY-006`
- Objective: Let a player send a cargo-carrying worker to deposit at an owned
  completed Base with a right-click, and show the carry animation whenever a
  worker holds cargo, even without an active `GATHER` order.
- Why: After a manual `MOVE`/`STOP` interrupts a gather cycle, the worker keeps
  its `Cargo` but loses its order. Today it cannot be sent to deposit by
  clicking the Base (only by re-issuing `GATHER` on the Mine), and its sprite
  falls back to `run`/`idle`, hiding the fact that it is carrying.
- Scope: `shared`, `protocol`, `simulation`, `server`, `renderer`, `web`.
- Non-goals: renaming the `Cargo` component; auto-return without an order;
  resuming the previous Mine after a manual deposit; an economy bar for
  cargo-only workers.

## Read first

- `packages/simulation/src/systems/economy-system.ts`
- `packages/simulation/src/commands/gather.ts`, `move.ts`, `apply-command.ts`
- `packages/simulation/src/contracts/orders.ts`, `ecs/components.ts`
- `packages/protocol/src/messages/snapshot.ts`, `messages/command.ts`
- `apps/server/src/sessions/session.ts`
- `packages/renderer/src/economy-animation.ts`, `unit-sprite.ts`, `unit-layer.ts`
- `apps/web/src/screens/useMatchSession.ts`, `hud/SelectionPanel.tsx`

## Contract

- New command `DEPOSIT { unitIds, buildingId }`: valid only for owned pawns
  with a `Cargo` component; the target must be an owned completed Base.
  Validation is atomic (a rejection leaves state untouched).
- New order `DEPOSIT { buildingId }`: the worker walks to the Base; on arrival
  `player.gold += cargo.amount`, cargo resets to 0, and the order is removed
  (the worker becomes idle). If the Base stops being a valid owned completed
  Base, the order is dropped and movement cleared.
- New snapshot field `SnapshotUnit.carrying?: boolean`, projected whenever
  `Cargo.amount > 0`, independent of the front order. `SnapshotEconomy` is
  unchanged.
- Renderer priority: gather → attack → carry (`to_base` or `carrying`) →
  run → idle.
- Playable surface: right-clicking an owned completed Base with carrying pawns
  selected sends `DEPOSIT`; the HUD reports the carrying status.
- Determinism: the new order tag `7` does not change the bytes of existing
  states, so the golden hash must stay green.

## Tests and validation

```bash
pnpm run verify:fast
pnpm run verify:simulation
pnpm run test:contracts
pnpm run test:orders
pnpm run verify
pnpm run test:e2e:focused tests/e2e/economy-playable.spec.ts --list
pnpm run test:e2e:focused tests/e2e/economy-playable.spec.ts
```

## Acceptance and stop conditions

- [ ] Right-clicking an owned completed Base deposits carried cargo and leaves
      the worker idle.
- [ ] A carrying worker shows carry animation while moving and idle without a
      `GATHER` order.
- [ ] Rejected `DEPOSIT` commands do not mutate state.
- [ ] Postmortem and regression test for the invisible carry state are added.
- [ ] Required tests and validation pass; no public API or architecture
      boundary regresses.
