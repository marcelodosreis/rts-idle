# Phase 1 report — Simulation core

```text
PHASE STATUS

Phase: 1 (Simulation core, master plan §23.2 + P1.01–P1.09)
Commit/reference: main @ Phase-1 gate (see tasks/todo.md)

Implementation:
PASS — full command contracts, order queue, players/wallet, surrender,
instant combat with simultaneous death, victory/draw/tick-limit, central
invariants, expanded determinism; hostile demo with combat feedback.

Unit:
131 / 131

Integration:
14 / 14

Simulation:
42 / 42

Contracts:
6 / 6

Orders:
6 / 6

Determinism:
6 / 6

Invariants:
6 / 6

Regression:
not applicable in this phase — no new browser regressions were introduced
(this phase restored simulation core lost in a prior merge; the standing
regression specs remain part of the e2e suite, 21/21).

E2E:
21 / 21

Stress:
not applicable in this phase — the benchmark harness covers scale (P0.17);
the renderer perf e2e remains green.

Performance:
not applicable in this phase — no new performance acceptance criteria;
renderer perf e2e (5000 sprites, p95 < 100 ms) green.

Typecheck:
PASS

Lint:
PASS

Build:
PASS

Replay reproduction:
PASS — mixed command streams (MOVE/ATTACK/HOLD/PATROL/ATTACK_MOVE/SURRENDER)
replay tick-for-tick and from restored snapshots (core-replay).

Known issues:
- Pawn units have no dedicated attack pose; the attack animation falls back
  to idle (the pack offers Interact; warrior/archer have real attack frames).
- Death uses a procedural explosion ring; the pack Explosion strip is not yet
  wired.
- The client sends only MOVE commands; the other commands are exercised via
  the simulation/contracts/orders suites.

Evidence:
pnpm verify  -> all vitest suites + typecheck + lint + build PASS
pnpm exec playwright test -> 21/21 PASS
docs/simulation.md, docs/commands.md, tests/architecture/public-api.test.ts

Next eligible task:
Phase 2 — Economy and production (P2.01–P2.12, master plan).
```

## Gate notes

The simulation core tasks A1–A10 were **rebuilt from scratch** (user decision,
2026-09-17) because the prior branch work was lost in the merge of the
engineering refactor (commit `82212a8` dropped the old-layout systems; only
movement was restored). A11–A14 and the visual track (V7–V13) were completed
on top. Docs (`docs/handoff-animations.md`, `tasks/todo.md`) were stale and
have been synced (G1).

Definition of Done: verified by `pnpm verify` (typecheck, lint, 8 vitest
suites, build) plus the 21-test Playwright suite; no public `@rts/*` API was
removed unintentionally; architecture barriers green; every new module is
cohesive with one responsibility and no forbidden dependencies.