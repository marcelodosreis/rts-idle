---
status: open
classe: coverage
barreira: null
regressao:
  - tests/integration/economy-chain.test.ts
  - tests/integration/session-commands.test.ts
  - tests/integration/formation-destinations.test.ts
  - tests/simulation/collision.test.ts
  - tests/e2e/regression/regression-movement-collision.spec.ts
---

# Movement Integration Deadlocks

## Summary

The first collision and navigation integration caused existing gather, build,
and formation flows to stop progressing. Workers treated resource tiles as
walls, units starting on a building footprint could not leave it, selected
formation units deadlocked against units that had already arrived, and a builder
could oscillate inside the initial worker group instead of reaching its
construction work point. The failures were deterministic and affected both
simulation integration tests and the real match path.

## Symptom

Gather workers remained in `TO_RESOURCE`, builders remained in `moving`, and
multi-unit MOVE commands did not clear their `Movement` components within the
existing test limits. The isolated browser collision scenario could pass
independently, which initially obscured the integration regressions and did not
exercise the four-worker `regression` composition.

## Root cause

Placement-reserved resource tiles were reused as navigation obstacles even when
the resource definition had `blocksNavigation: false`. Exact final-destination
routing therefore tried to enter a blocked resource tile. Collision checks also
treated a unit beginning on a building edge as blocked, formation avoidance
continued checking teammates after their movement components had been cleared,
and local avoidance accepted the first clear offset even when it moved farther
from the target. The latter made a builder oscillate around its starting group
without a persistent route.

## What we missed

The new collision tests covered routing around a standalone building and an
unreachable target, but did not cover the existing movement producers together:
resource gathering, construction from a base footprint, and formation arrival.
The browser collision test also used a simpler dedicated scenario rather than
the unified `regression` fixture, so it missed the starting worker group. The
completion gate also ran the focused simulation suite before the final routing
changes, rather than rerunning the integration suite immediately after each
canonical movement change.

## Fix

- `packages/simulation/src/navigation/navigation-state.ts` now accepts
  placement-reserved tiles that remain traversable.
- `packages/simulation/src/engine/create-simulation.ts` excludes resources with
  `blocksNavigation: false` from the navigation grid.
- `packages/simulation/src/movement/collision.ts` permits a unit to leave a
  footprint it starts on, treats tangent unit bounds as non-overlapping, and
  includes deterministic southward avoidance candidates.
- `packages/simulation/src/systems/movement-system.ts` keeps deterministic
  cooperative formation/work-point handling, chooses the clear local step that
  makes the most progress toward the target, and uses local avoidance steps for
  blocked movement.
- Out-of-bounds direct movement remains compatible with existing command
  fixtures unless a real building/static obstacle requires routing.

## Regression

The existing integration tests now cover the affected producers:

- `tests/integration/economy-chain.test.ts` completes gather, deposit, upgrade,
  construction, production, and research.
- `tests/integration/session-commands.test.ts` reaches harvesting and BUILD
  state transitions.
- `tests/integration/formation-destinations.test.ts` clears all formation
  movement and preserves distinct destinations.
- `tests/integration/economy-chain.test.ts` verifies that the first worker in
  the four-worker regression fixture reaches a new House construction point.
- `tests/simulation/collision.test.ts` verifies that a unit starting on a
  building edge can leave the footprint.

## Prevention

Navigation tests must distinguish placement reservation from movement blocking,
and every movement producer in `P3.06.01` must be included in the focused
integration gate. The resource traversal and start-on-footprint cases are now
co-located with the simulation collision regressions.

All player-facing gameplay E2E coverage now starts from the unified `regression`
scenario. The former isolated `movement-collision` demo was removed after
migration, so browser coverage cannot pass by avoiding the real regression
fixture composition.

## Verification

- `corepack pnpm exec vitest run tests/integration/economy-chain.test.ts tests/integration/session-commands.test.ts tests/integration/formation-destinations.test.ts tests/integration/move-command.test.ts tests/simulation/collision.test.ts` passed (`31/31`).
- `corepack pnpm --filter @rts/simulation run typecheck` passed.
- Focused Biome checks passed for all changed simulation and collision files.
- `corepack pnpm run verify` passed, including the repository build.
- The historical isolated `movement-collision` E2E passed in Chromium and Firefox (`2/2`) before removal.
- `corepack pnpm run test:e2e:focused tests/e2e/regression/regression-movement-collision.spec.ts --project=chromium --project=firefox` passed (`2/2`).
