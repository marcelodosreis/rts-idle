# Task Packet: VS-01B — Playable Economy Integration

## Task ID

`VS-01B`

## Objective

Expose the existing Economy v0 loop through a deterministic browser scenario and the normal player command path.

## Why

VS-01 is authoritative and tested in simulation, but no browser scenario seeds its entities and the client cannot observe or target them.

## Scope

```text
apps/server/src/demo/** and sessions/session.ts
packages/protocol/src/messages/snapshot.ts
packages/renderer/src/{types,renderer,world-object-layer}.ts
apps/web/src/{client,screens}/**
focused unit, integration, and browser E2E tests
```

## Read First

```text
apps/server/src/demo/scenarios.ts
apps/server/src/demo.ts
apps/server/src/sessions/session.ts
packages/protocol/src/messages/snapshot.ts
packages/renderer/src/renderer.ts
apps/web/src/screens/useMatchSession.ts
```

## Relevant Contracts

- VS-01 keeps `PlayerState.gold` as the mineral wallet and owns all gather/deposit behavior.
- The server remains authoritative; the renderer and web client only present observations and submit immutable commands.
- Protocol inputs and snapshots are runtime-validated.

## Implementation Requirements

1. Add a dedicated `economy` scenario with a player Worker, owned Base, Mineral Node, and remote opposing Base.
2. Project Bases and Mineral Nodes separately from units in authoritative snapshots.
3. Render Base and Mineral Node with minimal distinguishable graphics and target hit testing.
4. Selecting a Worker and right-clicking a Mineral Node sends the existing `GATHER` intent.
5. Display player 0's authoritative `gold` in the existing Mineral HUD chip.
6. Preserve existing MOVE/ATTACK targeting and STOP cancellation.
7. Bump the protocol to `0.4.0`; do not change simulation state, version, or golden hash.
8. Project gather phase/progress/cargo for presentation and use the existing pickaxe/gold Pawn sprites.
9. Show a contextual progress/cargo bar and visible HUD status while the cycle is active.

## Playable Surface

- Route: `http://localhost:5173/?scenario=default`
- Interaction: left-click Worker, right-click Mineral Node, observe return/deposit/repeat, then click **Stop**.
- Expected: the Worker visibly mines with a pickaxe, returns carrying gold, and Minerals changes from `0` to `10` without console or protocol injection.

## Tests Required

- Protocol guards and snapshot-to-frame mapping for Base/Mineral projections.
- Session integration for authoritative economy projection and command submission.
- Browser E2E using real pointer/button interaction for gather, deposit, repeat, and STOP.

## Validation Commands

```bash
pnpm vitest run tests/unit/protocol-messages.test.ts tests/unit/snapshot-to-frame.test.ts
pnpm run test:integration
pnpm run test:e2e:focused tests/e2e/economy-playable.spec.ts --list
pnpm run test:e2e:focused tests/e2e/economy-playable.spec.ts --project=chromium
pnpm run verify
```

## Acceptance Criteria

- [x] `?scenario=default` exposes a selectable Worker, owned Base, and Mineral Node.
- [x] Contextual right-click reaches authoritative `GATHER` through the existing command path.
- [x] Worker visibly travels, gathers, returns, deposits, and repeats.
- [x] The visible Mineral balance reaches `10` after deposit.
- [x] STOP interrupts the loop.
- [x] Mining, gathering progress, carried cargo, and return state are visibly distinct.
- [x] Existing validation remains green.

## Non-Goals

- Construction, production, AI economy, pathfinding, collision, fog, multiplayer, polished economy UI, additional resources, or balance changes.

## Stop Conditions

- Stop when the playable acceptance path and repository completion gates pass.
- Do not begin VS-02.
