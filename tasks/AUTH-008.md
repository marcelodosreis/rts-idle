# AUTH-008 — Configured HUD catalogs

**Status:** done

## Task

- Objective: make scenario selection and construction UI consume `MatchConfig` catalogs.
- Scope: protocol config, HUD, session connection, browser tests.
- Non-goals: adding new building types.

## Read first

`apps/web/src/screens/useMatchSession.ts`, `apps/web/src/hud/CommandBar.tsx`, `apps/web/src/hud/MatchHud.tsx`, building/scenario data, HUD E2E tests.

## Contract

Scenario summaries and building label/cost/footprint come solely from server config. Query parameters only seed a next request. Build mode is `idle | patrol | attack | attack_move | { kind: 'build'; buildingType }`.

## Tests and validation

List focused HUD E2E first, then run it; `pnpm run test:architecture`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## Acceptance and stop conditions

- [ ] No local scenario/catalog/cost/footprint drives match UI.
- [ ] Changing scenario reconnects through a new request.

## Completion report

Report PASS/BLOCKED, E2E count, changed files, and architecture impact.
