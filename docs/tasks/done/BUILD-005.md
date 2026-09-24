# Task Packet: BUILD-005 — Construction Cancellation

## Task

- ID: `BUILD-005` / master-plan P2.05
- Objective: Let a player cancel their own not-yet-completed construction,
  receiving a partial mineral refund, releasing the builder and the footprint.
- Why: A foundation currently cannot be removed; cancelling is required to close
  the construction lifecycle and is the acceptance test `construction-refund`.
- Scope: `shared`, `game-data`, `protocol`, `simulation`, `server` projection,
  `web` HUD, tests, `docs/commands.md`.
- Non-goals: demolishing completed buildings, production-queue cancellation,
  supply reservations, pathfinding, master-plan changes.

## Read first

- `packages/simulation/src/commands/build.ts`
- `packages/simulation/src/commands/apply-command.ts`
- `packages/simulation/src/systems/economy-system.ts`
- `packages/simulation/src/ecs/building-component.ts`
- `packages/simulation/src/contracts/commands.ts`
- `packages/shared/src/commands.ts`
- `packages/protocol/src/messages/command.ts`
- `apps/web/src/features/match/ui/SelectionPanel.tsx`

## Contract

- New command `CANCEL_CONSTRUCTION { buildingId }`.
- Validation is atomic (before any mutation): phase `RUNNING`, active player,
  building exists, `Owner.owner === playerId`, `status !== 'COMPLETED'`
  (otherwise `INVALID_STATE`).
- Apply: credit the refund, detach the builder (clear its `BUILD` order and
  movement, set `builderId: null`), then `removeEntity(buildingId)` so the
  footprint is released. The worker stays where it is (no auto-return).
- Refund (master-plan §11.3), integer arithmetic with explicit denominator:
  `refund = floor(costMinerals * (totalTicks - progressTicks) * 3 / (totalTicks * 4))`.
  A foundation (progress 0) refunds 75% of the cost.
- Deterministic; the canonical schema is unchanged (entity removal), so
  `SIMULATION_VERSION` and the golden hash stay intact.
- HUD: a destructive "Cancel construction" action lives in the construction
  card (`SelectionPanel`), visible only for non-completed owned constructions,
  with two-step confirmation and an estimated refund (`~`) derived from the
  shared `constructionRefund` helper. The authoritative credit always comes
  from the simulation.

## Tests and validation

```bash
pnpm run typecheck
pnpm run lint
pnpm run test:unit
pnpm run test:simulation
pnpm run test:contracts
pnpm run test:invariants
pnpm run test:orders
pnpm run verify
pnpm run test:e2e:focused tests/e2e/building-hud.spec.ts --list
pnpm run test:e2e:focused tests/e2e/building-hud.spec.ts
```

Expected E2E count: `12` (focused `building-hud.spec.ts`: 6 tests × 2 browsers)

## Acceptance and stop conditions

- [x] Not-yet-completed owned construction is cancellable; completed or
  unowned buildings are rejected atomically with the right error code.
- [x] Refund follows the exact formula and is deterministic across
  snapshot/replay; builder orders/movement are cleared and the footprint freed.
- [x] HUD exposes the two-step cancel action and the building disappears.
- [x] Required tests and validation pass; no public API or architecture
  boundary regressed.
- [x] Scope complete; stop without production or demolition work.

## Completion report

PASS. Added `CANCEL_CONSTRUCTION`, the shared `constructionRefund` formula, the
simulation handler with builder detachment, a dangling-`BUILD`-order invariant,
and the two-step HUD action with an estimated refund. `pnpm run verify` green;
focused `building-hud.spec.ts` 12/12 and full `test:e2e:fast` 178/178 green.
No canonical schema, `SIMULATION_VERSION`, or golden hash changed.
