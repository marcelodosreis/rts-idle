# ADR-006 — Replay as first-class infrastructure

Status: Accepted

## Context

Bugs, desyncs, balance data, self-play analysis, and future spectator features all need exact reproduction. Without it, a reported issue at tick 18,293 cannot be replayed, minimized, or fixed with confidence.

## Decision

- A replay is: `seed + versioned rules + map identity + canonical command stream`, verified by per-tick state hashes, recorded from the start of the project.
- A replay is a single artifact that doubles as a bug report, a debugger, a test case, a balance data point, and a desync reproduction.
- Replay and hashing are not a Phase 7 add-on; minimal replay and hashing exist from Phase 0 and grow with the project.
- Versioning separates protocol, replay format, snapshot schema, simulation, and content versions; incompatible replays are rejected with a precise message.

## Alternatives

- **Telemetry/log-only diagnostics**: rejected — no exact reproduction.
- **Screenshots/video**: rejected — no data, no determinism.
- **Deferring replay until multiplayer exists**: rejected — retrofitting determinism into a running game is where competitive games die.

## Consequences

- **Positive**: exact reproduction of any match; a growing regression/balance corpus; fuzz failures are always reproducible; AI training data is free.
- **Negative**: strict versioning discipline for rules, maps, and protocol; canonical serialization must be maintained.

## Evidence

- `tests/determinism/minimal-replay.test.ts` — identical hashes from seed + commands, and snapshot-forward replay.
- `docs/master-plan.md` §19 (format, hashing, divergence, tooling).
- `packages/simulation` snapshot/hash support and `tools/replay`.