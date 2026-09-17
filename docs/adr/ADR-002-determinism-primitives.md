# ADR-002 — Determinism primitives: integer/fixed-point arithmetic, xoshiro128**, canonical SHA-256

Status: Accepted

## Context

Floating-point math, `Math.random`, platform-dependent ordering, and locale-dependent output produce runtime divergence. A competitive RTS with replay, self-play, and hashed states cannot tolerate any of it.

## Decision

- Positions and distances use fixed point with `1 tile = 256` fixed units.
- HP, armor, resources, supply, costs, and percentages (basis points, `10_000 = 100%`) are integers.
- Cooldowns and durations are tick counters.
- RNG is **xoshiro128\*\*** with four `uint32` words, a documented seed, and an all-zero state guard.
- State hashing uses canonical byte serialization (explicit schema order) + portable SHA-256.
- Forbidden in the core: `Math.random`, `Date`, `performance.now`, timers, I/O, locale-dependent behavior, and ordering without an explicit tie-breaker.

## Alternatives

- **Floats with epsilon comparisons**: rejected — no exact equality across runtimes.
- **`JSON.stringify` as canonical hash**: rejected — object key order and `Map` iteration are not guaranteed.
- **Platform RNG / PRNG without golden vectors**: rejected — untestable and non-portable.

## Consequences

- **Positive**: identical hashes across Node/Chromium/Firefox/WebKit; golden-vector tests pin the exact sequence; replay and fuzz are exact.
- **Negative**: authoring must use representable fixed values; every numeric path must prove it stays below `Number.MAX_SAFE_INTEGER`.

## Evidence

- `packages/shared/src/fixed.ts`, `rng.ts`, `ids.ts`.
- `packages/simulation/src/canonical/encoder.ts` and `snapshot/serialize.ts`.
- `tests/unit/deterministic-primitives.test.ts` — golden sequence for seed 1, bounds, zero-state guard.
- `tests/determinism/minimal-replay.test.ts` — identical per-tick hashes.