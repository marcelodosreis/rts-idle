# ADR-013: Frozen system order

Status: Accepted

Date: 2026-09-16

## Context

The simulation's per-tick semantics depend on the order systems run (e.g.,
research completing before combat in the same tick; simultaneous deaths
resolved before victory). An ad-hoc order would make behavior ambiguous and
replays version-sensitive.

## Decision

Freeze an explicit, documented **system order** (master plan §9.2) that every
`step()` follows:

1. expire temporary effects
2. validate + apply scheduled commands
3. update orders / request navigation
4. run the pathfinding budget
5. resolve movement + collision
6. gather, deposit, repair
7. advance construction
8. advance research
9. update supply + advance production
10. update vision (target acquisition)
11. select attacks / create damage events
12. advance projectiles
13. apply accumulated damage
14. resolve deaths + cleanup
15. recompute supply
16. final vision + player memory
17. evaluate defeat/victory/duration
18. invariants (mode-dependent)
19. emit events + optional hash

Intentional consequences: research affects combat the same tick; a completed
production unit does not attack that tick; two combatants can kill each other
simultaneously; projectiles created now do not move immediately; all deaths are
resolved before victory.

## Alternatives

- Per-system scheduling left implicit — rejected: ambiguous, non-reproducible.
- Data-driven dependency graph — deferred: overkill while the order is stable
  and small.

## Consequences

Changing this order requires an ADR and a new simulation version (it changes
replay semantics). The order is documented in `docs/simulation.md` (planned)
and `docs/master-plan.md` §9.2.

## Evidence

Behavioral tests that depend on ordering: `tests/integration/move-command.test.ts`
(command application before tick semantics), simultaneous-death and victory
ordering tests in Phase 1 (`P1.06`/`P1.07` planned).

## Phase 3 implementation addendum (2026-10-04)

For simulation version `0.20.0`, the authoritative exported pipeline remains
the existing twelve entries in `packages/simulation/src/systems/pipeline.ts`.
The navigation budget runs as the first deterministic substep of `orders`,
before movement, without adding or reordering a pipeline entry. The numbered
nineteen-stage sequence above remains the long-term target for future systems;
adopting any of those additional entries requires a separate ADR, version bump,
golden-hash review, and pipeline test update.
