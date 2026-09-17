# ADR-007 — M0 "Playable Core": vertical-slice sequencing

Status: **Superseded** (2026-09-16)

**Superseded by user decision:** M0 was withdrawn; the project returns to the
original phase ordering (Phase 0 → Phase 1 → Phase 2 → Phase 3 → …). The master
plan §2 and §23 were reverted accordingly. This ADR is kept as a historical
record of the considered sequencing and its rejection rationale.

## Context

The current phase ordering is engineering-first: foundation → simulation core → economy → navigation/combat/fog → content → AI → rooms → tooling → browser MVP. The first genuinely playable loop ("do I want another match?") would only arrive at the M1 gate. This is the trap of building the perfect engine and only then asking if the game is fun.

## Decision

- After the Phase 0 foundation, deliver an **M0 Playable Core**: a thin vertical slice on the real pipeline with a truncated ruleset — 1 map, 2 bases, 8 workers, 1 resource, and the commands MOVE / GATHER / BUILD / TRAIN / ATTACK / STOP, with victory by base destruction.
- The slice cuts depth, not architecture: no fog (full visibility), no projectiles/AoE (instant damage), no A* budget (direct pathing), no repair/research/Energy.
- It keeps the real command → validation → simulation → state → hash → replay pipeline, with server authority and determinism intact.
- After M0, phases 1–3 become deepening passes (fog, nav budget, projectiles, collision, economy rules) on an already-playable core.
- The milestone question is: **"Do I want to play another match?"** A "no" must surface early, cheaply.

## Alternatives

- **Keep the current phase ordering**: rejected — fun signal arrives too late.
- **Throwaway prototype in a different stack**: rejected — it would not exercise the real pipeline, determinism, or replay, and would be thrown away.

## Consequences

- **Positive**: early fun and design-iteration signal; the loop is already the real architecture; content and systems grow on a playable base.
- **Negative**: some minimal systems are simplified and later replaced; requires reordering phases and gates in `docs/master-plan.md` §23 (coordinated pass, flagged in the ledger).

## Evidence

- `docs/proposals/m0-playable-core.md` — detailed slice scope, cuts, gates, and phase impact.
- The pipeline to be proven by M0 already exists and is tested at Phase 0 (`fixed-tick`, `move-command`, `authoritative-move`, `minimal-replay`).