# Determinism — rts-idle

The simulation is deterministic by construction: the same seed, initial state,
and command stream always produce the same result, on every platform and across
replays. This document is the operational reference; the math lives in
`packages/shared` and `packages/simulation`.

## Rules

- **No platform inputs in the core.** `packages/simulation` imports no
  `Date`, `Math.random`, `performance.now`, timers, I/O, or locale-sensitive
  APIs (`tests/architecture/simulation-isolation.test.ts`).
- **Seeded RNG.** All randomness comes from `createRng(seed)` (xoshiro128** +
  splitmix32), serialized with the state.
- **Integer arithmetic.** Positions are integer fixed units (`FIXED_SCALE =
  256`); movement uses an integer remainder accumulator (`movement-step.ts`),
  deterministic rounding (`roundDiv`), and `intSqrt` — never floats.
- **Frozen system order.** The pipeline runs in a pinned order
  (`SYSTEM_PIPELINE`, ADR-013); reordering is forbidden and asserted by a test.
- **Deterministic iteration.** Systems iterate `world.aliveIds()` (sorted by
  id) and pick targets by strictly-lower distance, so ties resolve to the
  lowest id. Economy lets every Worker at a resource progress independently;
  this ordering allocates only scarce final batches, while Castle distance ties
  still resolve to the lowest id.
- **Frozen schema.** The canonical byte format (component registration order,
  presence flags, tags) is pinned by `tests/simulation/hash-golden.test.ts`.
  Changing it requires a deliberate `SIMULATION_VERSION` bump and golden regen.

## Verification

- `tests/simulation/hash-golden.test.ts` — pins the canonical bytes + SHA-256.
- `tests/determinism/minimal-replay.test.ts` — seed-only replay, tick-for-tick.
- `tests/determinism/core-replay.test.ts` — mixed command streams (MOVE, orders,
  combat, surrender) replay identically, including from a restored snapshot.
- `tests/e2e/determinism-browser.spec.ts` — Node ≡ Chromium hash equality.

## Compatibility

`SIMULATION_VERSION` is the tag on every state. It is `0.13.0` (Castle II,
Research, modifiers, and fixed-point movement joined the canonical snapshot
stream). A mismatch in
rules identity means the states are not interchangeable.
