# Proposal: M0 "Playable Core" — a vertical slice before the content phases

Status: **Withdrawn** (2026-09-16, user decision)

The M0 sequencing was withdrawn; the project follows the original phase ordering
(Phase 0 → Phase 1 → …). See ADR-007 (superseded). Kept as a historical record.

## Problem

The phase order is engineering-first: foundation → simulation core → economy → navigation/combat/fog → content → AI → rooms → tooling → browser MVP. Under this order the first genuinely playable loop arrives only at the M1 gate. That delays the question the project exists to answer: **"do I want to play another match?"**

The risk is not engineering — it is building the perfect engine and discovering only at the end that the loop is not fun, or that a core feel assumption is wrong (movement, gathering, combat readability).

## Decision

Introduce **M0 "Playable Core"** immediately after the Phase 0 foundation (after the Phase 0 gate passes). M0 is a thin vertical slice on the **real pipeline** — command → validation → simulation → state → hash → replay — with a truncated ruleset, running headless and in the browser.

## Slice scope

Included:

- 1 map, small, authored.
- 2 bases, 8 workers each.
- 1 resource (Mineral).
- Commands: `MOVE`, `GATHER`, `BUILD`, `TRAIN`, `ATTACK`, `STOP`.
- Minimal economy: gather → carry → deposit at own Base.
- Minimal building: placement + footprint + construction progress.
- Minimal production: queue + cost + supply + spawn.
- Minimal combat: instant damage, range, cooldown, death.
- Victory/defeat by destruction of all enemy Bases.

Cut (explicitly out of the slice, added in the deepening phases):

- Fog of war (full visibility in M0).
- Projectiles and AoE (instant damage in M0).
- A* budget / incremental pathfinding (direct pathing in M0).
- Energy resource, repair, research, rally, patrol, hold, attack-move, abilities.
- Collision beyond simple no-overlap.
- Multiplayer beyond the existing single technical session.

Kept intact (non-negotiable):

- Isolated deterministic simulation, single writer, server authority (ADR-001).
- Fixed point + deterministic RNG + canonical hashing (ADR-002).
- Snapshot/restore and replay of the slice (ADR-006).
- The same packages and interfaces that the full game will use.

## Success gate

The M0 gate answers the core question with evidence:

- The slice is playable in the browser through the real server flow (human controls the loop).
- Headless runs complete matches to a result and reproduce via replay (same hashes per tick).
- Invariants hold across N seeded runs.
- **Design feedback recorded**: a human plays the slice and the answer to "do I want to play another match?" is written down, whatever it is — a "no" is a successful early detection, not a failure.

## How the phases change

Current:

```
F0 foundation → F1 sim core → F2 economy → F3 nav/combat/fog → F4A M1 content → F5 AI → F6 rooms → F7 tooling → F8 browser MVP
```

Proposed:

```
F0 foundation → M0 playable core (thin, real pipeline) → F1–F3 as deepening passes on the playable core → F4A M1 content → F5 AI → F6 rooms → F7 tooling → F8 browser MVP → F4B/9 M2
```

The deepening passes are the existing phases 1–3, re-applied to a core that is already playable: economy rules, nav budget + collision, fog + observations, projectiles/AoE, group movement.

## Impact on master-plan §23

- Add a milestone to §2 and a phase block (M0) after Phase 0 in §23.
- Reorder phase 1–3 delivery so each deepening pass keeps the game playable.
- Gate M0 is added to the Phase 0 gate checklist.
- This is a **coordinated pass**: `docs/master-plan.md` is shared territory and must be reviewed before the tables are rewritten.

## Open questions for approval

1. Approve M0 as the sequencing change (ADR-007 becomes Accepted)?
2. Should M0's playable slice be exposed in the browser through the real room flow, or is a direct "start match" path acceptable for M0 (recommended: direct path; room flow stays with Phase 6)?
