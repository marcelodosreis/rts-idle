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

## Minimum Replay Format

Replay files are UTF-8 JSON documents with `format: "rts-idle-replay"` and
`version: 1`. They contain `seed`, the full rules `identity`, an absolute target
`ticks` value, and a `commands` array of `ScheduledCommand` values. The tool
injects the command array on the first simulated tick; each command's `tick`
controls authoritative execution and future commands therefore exercise the
simulation queue. Optional `hashes` entries validate post-tick SHA-256 values.
An optional `initialSnapshot` contains `tick`, `hash`, and `bytesBase64` for
snapshot-forward replay.

`pnpm run replay -- <file>` reports JSON with `finalTick`, `finalHash`, and the
number of rejected commands. `--validate` reports the first divergent tick and
`--artifact <path>` writes a self-contained failure artifact.

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
