# ADR-001 — Isolated deterministic simulation with server authority and a single writer

Status: Accepted

## Context

The game must run in the browser, on the server, in CLI tools, in tests, in replay, and in fuzzing without changing logic. It must also reproduce identical results from the same inputs, keep fog of war honest for humans and bots, and trust nobody on the network.

## Decision

- The simulation lives in `packages/simulation`, is synchronous, deterministic, and imports no React, DOM, WebSocket, Node APIs, or renderer.
- There is exactly one writer: `step()` and the internal systems it invokes. Commands, observations, and snapshots are immutable outside the core.
- The server is authoritative. Clients send commands and render; they never compute damage, resources, production, or victory.
- The authorized mutability exception covers the private GameState owned by the simulation, including the deterministic navigation work it owns.

## Alternatives

- **Client-side lockstep**: every client runs the full simulation. Rejected — requires trusted clients and leaks the full state, contradicting fog of war.
- **Browser authority**: cheapest to prototype, but makes replay, self-play, and anti-cheat impossible.
- **Shared mutable state across packages**: rejected — no single writer, no reproducibility.

## Consequences

- **Positive**: replay, self-play, fuzz, and debugging all run on the same core; fog is enforced at the observation boundary; cheating surface is minimal.
- **Negative**: the renderer/UI can never contain gameplay logic; simulation performance must be proven in isolation (Spike A/B), so the core must be fast enough on its own.

## Evidence

- `tests/architecture/simulation-isolation.test.ts` — import barrier.
- `apps/server/src/sessions/session.ts` — `GameSession` as the only path to advance state.
- `tests/determinism/minimal-replay.test.ts` — per-tick hash equality across instances.
- `AGENTS.md` §8.5 (authorized mutability exception).