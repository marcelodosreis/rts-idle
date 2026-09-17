# ADR-009: Simulation tick rate

Status: Accepted

Date: 2026-09-16

## Context

The simulation runs on a discrete fixed timestep; the game loop must pick a tick
rate. Higher rates improve input latency and combat granularity but cost CPU.
The master plan (Spike B, §21.2) required a measured comparison of 20/30/60
ticks/s before freezing a decision.

## Decision

Use **20 ticks/s** as the authoritative simulation rate.

Decision rule applied (§21.2): keep 20 unless 30 shows a demonstrable gain with
sufficient CPU budget; use 60 only with evidence of need. The Phase 0 benchmark
showed no measurable gain at higher rates for the current systems.

## Alternatives

- 30 ticks/s — would slightly reduce the 50 ms grid for cooldowns/movement, but
  the benchmark showed the current per-tick cost is negligible at all rates, so
  there is no observable benefit yet.
- 60 ticks/s — rejected: highest cost, no measured need; revisit only if real
  systems (movement, pathfinding, combat) plus latency targets demand it.

## Consequences

- Cooldowns/durations compile from seconds to 20 ticks/s integers (1 s = 20
  ticks).
- The tick rate is part of the simulation contract and replay identity.
- When Phase 1–3 add real per-tick systems, re-run the benchmark harness and
  revisit; the harness makes the cost measurable in one command.

## Evidence

`pnpm run benchmark` — AMD Ryzen 5 2600 (12 threads), WSL2 linux, Node
v24.15.0, seed 12345, 200 steps, MOVE of 256 units per step:

| entities | avg step | p95 | cpu@20 | cpu@30 | cpu@60 | hash/call |
|---|---|---|---|---|---|---|
| 1,000 | 0.030 ms | 0.057 ms | 0.6% | 0.9% | 1.8% | 0.66 ms |
| 10,000 | 0.029 ms | 0.041 ms | 0.6% | 0.9% | 1.7% | 7.5 ms |

Per-tick hashing at 10k entities would cost ~7.5 ms/call, which is why hashing
runs at checkpoints (every 100 ticks), not per tick (see ADR-011).