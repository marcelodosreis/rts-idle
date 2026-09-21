# Spec: Replay Tooling

Module id: `replay-tooling`

## Objective

Headless execution, replay (recording/validation/seek/diagnostics), fuzz, balance, benchmark, and inspectors. Development tools under `tools/`.

## Commands

```bash
pnpm run replay -- <file>
pnpm run simulate -- --games 1000
pnpm run fuzz
pnpm run balance -- --games 1000
pnpm run benchmark -- --suite simulation
```

## Project Structure

```text
tools/
├── simulator/
├── replay/
├── balance/
├── fuzz/
└── benchmark/
```

## Code Style

Headless; reproducible; no renderer. Failure artifacts saved with seed, tick, commands, hashes, error, and replay.

## Testing Strategy

`tests/determinism/*`, `tests/invariants/*`, `tests/fuzz/*`. See master plan (phases 7, 22).

## Boundaries

- Always: reproduce from the last valid state; never publish a partially modified state.
- Ask first: concurrency in advancing the same world.
- Never: use `Math.random`; change the semantics of IDs/hash/RNG.

## Success Criteria

- `replay --validate` detects divergence and reports the interval/tick.
- A fuzz failure saves a reproducible replay.
- Headless reports correct counts and exit codes.

## Open Questions

None.