# Spec: Simulation

Module id: `simulation`

## Objective

GameState, ECS, commands, systems, observations, snapshots, hashing, and invariants. A portable, synchronous, deterministic core with no platform dependencies.

## Commands

```bash
pnpm run test:unit
pnpm run test:integration
pnpm run test:simulation
pnpm run test:determinism
pnpm run test:invariants
pnpm run build
```

## Project Structure

```text
packages/simulation/src/
├── contracts/
├── state/
├── ecs/
├── commands/
├── systems/
├── observation/
├── snapshot/
├── invariants/
└── engine.ts
```

## Code Style

Integer/fixed-point; xoshiro128** RNG; monotonic IDs; single writer; system order frozen and documented (master plan, section 9).

## Economy order contract

- `Order` gains `DEPOSIT { buildingId }` (canonical tag 7): the worker walks to
  the Base, credits its `Cargo` on arrival, then clears the order and stays
  idle. Executed by the economy system; system order is unchanged.

## Testing Strategy

See master plan (sections 22, 23). Each system has behavioral tests; invariants run during simulations; determinism tests equivalent streams.

## Initialization ownership

`createSimulation(options)` takes ownership of every mutable input:

- `initialWorld` is deep-cloned (component values are normalized through their
  canonical codecs) and the copy preserves the world's change-history capacity.
- `initialPlayers` entries, their `resources` wallets, and
  `completedResearch` arrays are copied; defaults fill absent supply fields.
- `mapBounds.invalidTiles` is copied element by element.
- `resources` definitions are validated once and converted into compact
  `ResourceState`; the caller's array is not retained.

After construction, mutating any caller-owned object passed to
`createSimulation` must not affect the running simulation. Only `step()` and
the systems it invokes may mutate authoritative state.

## Boundaries

- **Never imports** React, Phaser, DOM, Canvas, WebSocket, browser APIs, Node APIs, renderer, or UI.
- Always: independent observations/snapshots; immutable commands; atomic validation.
- Ask first: change system order, arithmetic, IDs, RNG, authority, fog, serialization.
- Never: allow UI/bot/network to modify state directly.

## Success Criteria

- `step` is synchronous, one advance per call.
- `hashState` is reproducible between Node and browsers.
- Snapshot/restore preserves the semantic result.
- Fog does not leak hidden state.

## Open Questions

None.