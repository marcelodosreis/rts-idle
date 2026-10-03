# QH.28.01 — Unified Regression E2E Fixture

**Status:** done
**Phase:** Quality Hardening / unified gameplay E2E fixture
**Dependencies:** QH.27.01, P2.12

## Objective

Make `regression` the sole automated gameplay fixture while preserving the other
demo scenarios for manual use.

## Scope

- Demo scenario catalog and server bootstrap tests.
- Browser E2E support and gameplay suites.
- Scenario documentation and Phase 2 integration coverage.

## Non-goals

- Deleting or redesigning the `default`, `8v8`, `ffa`, or `monk-heal` demo scenarios.
- Changing simulation rules or adding new gameplay systems.
- Changing public manual scenario selection behavior.

## Read first

- `CURRENT_STATE.md`
- `docs/engineering-standard.md`
- `docs/architecture.md`
- `apps/server/src/content/demo/scenarios.ts`
- `apps/server/src/bootstrap/catalog.ts`
- `apps/server/src/bootstrap/match-bootstrap.ts`
- `tests/e2e/support/settle.ts`
- `tests/e2e/economy/economy-playable.spec.ts`
- `tests/e2e/economy/production-playable.spec.ts`
- `tests/e2e/economy/research-playable.spec.ts`
- `tests/e2e/economy/scenarios.spec.ts`

## Acceptance Criteria

- No automated gameplay E2E depends on `default`, `8v8`, `ffa`, `monk-heal`, or `research`.
- `research` is absent from the server scenario catalog.
- Composition-only scenario tests are removed.
- Retained demo scenarios still bootstrap successfully for manual use.
- Entity lookup is semantic and deterministic.
- P2.12 passes from the `regression` baseline.
- Typecheck, lint, architecture, verification, and Chromium/Firefox E2E gates pass.
- No unrelated scenario or gameplay cleanup is included.

## Contract

The server continues to publish the manual/demo scenario catalog, excluding the
removed `research` fixture. Automated gameplay E2E tests start a real server
match with `scenario=regression`; they may vary only the authoritative
`aggression` option when the behavior under test requires passive or offensive
enemies.

The `regression` scenario remains deterministic and starts from a Castle I
economy baseline with four workers, known Gold, map-authored resources, and a
damaged owned Castle. It additionally exposes the stable entities required by
generic combat, production, repair, Monk, and progression tests. Tests locate
entities by observed owner, kind, worker flag, building type, and health, never
by incidental global count or creation order.

Research tests no longer start from preconfigured Castle II/Monastery state.
They progress from `regression` through the real browser path before asserting
research behavior. The P2.12 flow uses the same fixture and covers
`gather -> deposit -> build -> produce -> research` through the real server.

Scenario-composition tests are removed or replaced by behavior tests. The
remaining demo scenarios have no automated gameplay dependency and remain
available for manual scenario selection.

## Design

- Scenario definitions remain owned by the server demo content boundary.
- E2E entity lookup and progression setup live in `tests/e2e/support/` and do
  not alter authoritative state directly.
- Browser assertions observe snapshots, HUD state, and authoritative ticks.
- Closed scenario identifiers remain typed through the existing server catalog;
  no loose scenario registry or compatibility alias for `research` is added.
- Existing simulation, protocol, renderer, and package boundaries remain
  unchanged.

## Validation

Focused browser targets include the migrated economy, production, research,
repair, Monk, combat, selection, and transport suites. Each target is listed
with Playwright before execution.

```bash
pnpm run verify:fast
pnpm run verify:simulation
pnpm run test:e2e:focused tests/e2e/economy/economy-playable.spec.ts --list
pnpm run test:e2e:focused tests/e2e/economy/production-playable.spec.ts --list
pnpm run test:e2e:focused tests/e2e/economy/research-playable.spec.ts --list
pnpm run test:e2e:fast
pnpm run test:e2e:prepare -- --output=tmp/e2e-plan.json
pnpm exec playwright test --list
pnpm run verify
```

The final E2E inventory is 248 tests in 34 files. The CI-equivalent matrix runs
functional and performance groups independently for Chromium and Firefox.

## Player-facing Completion

- [x] Existing match screen still supports manual selection of the retained demo scenarios.
- [x] Generic economy, production, research, combat, and repair flows start from `regression`.
- [x] Progress, success, and blocked states remain visible through the existing HUD.
- [x] The real server path is covered by browser E2E.

## Progress

The fixture migration, P2.12 flow, and final browser matrix are complete. The
retained demo scenarios remain available for manual selection.

## Completion Report

**Result:** PASS

`regression` is the sole automated gameplay fixture; retained demo scenarios
remain manual, and `research` is absent from the catalog. The final inventory
contains 248 tests in 34 files. Functional E2E passed in Chromium `121/121`
and Firefox `120 passed/1 skipped`; performance passed `6/6`; `verify` passed.
