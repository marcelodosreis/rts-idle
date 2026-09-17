# ADR-003 — Agent as adapter; no LLM in gameplay

Status: Accepted

## Context

External inference (LLM calls per decision) adds cost, latency, network dependency, and nondeterminism to the game itself. The game must be fully playable and fully testable offline, with zero API cost for large headless runs.

## Decision

- `AGENT` is a formal adapter: it receives a filtered `PlayerObservation` and returns `CommandIntent`s. It is a deterministic transform of observation + memory.
- The default participant is a deterministic local bot. No LLM, external API, or network call is part of gameplay or required to run a match.
- Replay records the canonical command stream, never bot internals; reproducing a match never re-runs any agent.
- A future LLM-backed agent plugs into the same adapter without changing the simulation.

## Alternatives

- **LLM-driven units/bots as the core experience**: rejected — not offline, not deterministic, not scalable to 100k headless matches.
- **No agent interface at all (only hardcoded bot)**: rejected — closes the door to external agents and self-play experiments.

## Consequences

- **Positive**: offline and deterministic; `simulate`/`balance`/`fuzz` run without inference cost; the agent boundary is future-proof.
- **Negative**: the game must be interesting against a scripted opponent; the adapter contract must be stable across versions.

## Evidence

- `docs/master-plan.md` §7.4 (agent contract) and §17.4 (BOT vs AGENT slots).
- `packages/ai` package (adapter contract; implementation lands with Phase 5).