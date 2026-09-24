# Task Packet: BUILD-004 — Supply Depot and Supply HUD

## Objective

Add authoritative supply accounting, Supply Depot construction, canonical
serialization/projection, and a browser HUD showing `used / cap`.

## Contract

- Each completed Base provides 10 supply capacity; each existing unit consumes
  1 supply; each completed Supply Depot provides 8 capacity.
- Supply capacity is capped globally at 200. Used supply and capacity are never
  negative. Losing capacity may leave a player over the cap; units are not
  removed because of over-cap.
- `SUPPLY_DEPOT` uses a 2×2 footprint, costs 100 minerals, and takes 100
  construction ticks. Foundations and paused/in-progress Depots provide no
  capacity; the completion tick activates the capacity.
- BUILD validation remains atomic and uses the existing worker assignment,
  footprint reservation, pause, takeover, and completion lifecycle.
- Player supply is included in canonical snapshots, restore, hashes, replay,
  protocol snapshots, and the server projection. The browser renders these
  values without deriving gameplay rules.

## Non-goals

Production queues, `TRAIN`, reserved supply, spawn, rally points, cancellation,
new units, research, energy, and client-side gameplay authority.

## Read first

- `packages/game-data/src/buildings.ts`
- `packages/shared/src/commands.ts`
- `packages/simulation/src/state/state.ts`
- `packages/simulation/src/snapshot/serialize.ts`
- `packages/simulation/src/systems/economy-system.ts`
- `packages/simulation/src/systems/death-system.ts`
- `packages/protocol/src/messages/snapshot.ts`
- `apps/server/src/sessions/session.ts`
- `apps/web/src/hud/TopBar.tsx`

## Tests and validation

- Unit, simulation, snapshot/replay, invariant, protocol, integration, and
  focused E2E coverage for initial supply, units, Depot lifecycle, over-cap,
  destruction, and HUD synchronization.
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test:unit`
- `pnpm run test:simulation`
- `pnpm run verify`
- `pnpm run test:e2e -- --project=chromium`

## Acceptance and stop conditions

- [x] Supply Depot is constructible and activates capacity only on completion.
- [x] Supply survives snapshot/restore and deterministic replay with equal hash.
- [x] Protocol and HUD show authoritative `used / cap`, including over-cap.
- [x] Required validation passes without production or reserved-supply work.
