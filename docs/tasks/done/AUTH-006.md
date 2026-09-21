# AUTH-006 — Single normalized map

**Status:** done

## Task

- Objective: carry one normalized map from request through simulation and renderer.
- Scope: server, simulation bounds, web connection/rendering, snapshots.
- Non-goals: map editor features or pathfinding.

## Read first

`apps/server/src/demo.ts`, `packages/simulation/src/engine/create-simulation.ts`, `apps/web/src/screens/useMatchSession.ts`, `apps/web/src/client/connection.ts`, map/hash tests.

## Contract

The server validates and normalizes the requested map, derives bounds and identity from it, and sends it in `match_config`. The web mounts only after that config; 32×32 is allowed only in explicit simulation fixtures.

## Tests and validation

Focused local-map, render, restore/hash tests; `pnpm run test:integration`; `pnpm run test:simulation`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## Acceptance and stop conditions

- [ ] A 64×48 local map reaches rendering with its true dimensions.
- [ ] Invalid water placement and map identity are preserved.

## Completion report

Report PASS/BLOCKED, evidence, changed files, and architecture impact.
