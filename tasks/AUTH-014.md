# AUTH-014 — Coordinate authority

**Status:** done

## Task

- Objective: consolidate shared map index, tile key, and coordinate conversions.
- Scope: shared map/placement and their consumers.
- Non-goals: changing map semantics.

## Read first

`packages/shared/src/fixed.ts`, `packages/shared/src/map.ts`, `packages/shared/src/placement.ts`, placement/render tests.

## Contract

Row-major indexing and tile keys have named shared authorities; equivalent formulas are removed without changing conversion outputs.

## Tests and validation

Focused conversion tests; `pnpm run test:unit`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## Acceptance and stop conditions

- [ ] Edge coordinates retain exact previous behavior through named helpers.

## Completion report

Report PASS/BLOCKED, evidence, changed files, and architecture impact.
