# AUTH-007 — Web dependency authority

**Status:** done

## Task

- Objective: remove web/renderer dependence on game-data gameplay authority.
- Scope: manifests, imports, architecture barriers.
- Non-goals: changing authored server content.

## Read first

`apps/web/package.json`, `tests/architecture/package-dependencies.test.ts`, `tests/architecture/public-api.test.ts`, and web imports.

## Contract

Only server imports game-data. Web and renderer consume protocol/shared observations and config; architecture tests reject forbidden imports.

## Tests and validation

`pnpm run test:architecture`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## Acceptance and stop conditions

- [ ] No web or renderer game-data import/transitive manifest entry remains.

## Completion report

Report PASS/BLOCKED, evidence, changed files, and architecture impact.
