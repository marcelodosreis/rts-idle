# AUTH-013 — Deterministic predicates

**Status:** done

## Task

- Objective: centralize completed-building predicates and distance-plus-ID tie breaking.
- Scope: economy, combat, construction, fixtures.
- Non-goals: balance changes.

## Read first

`packages/simulation/src/domain/building-predicates.ts`, economy/combat systems, construction tests.

## Contract

Completion semantics and ties are declared once; equal distances always resolve by entity ID before and after snapshot restore.

## Tests and validation

`pnpm run test:simulation`; `pnpm run test:orders`; `pnpm run test:determinism`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## Acceptance and stop conditions

- [ ] All shared selection rules are helper-owned with replay coverage.

## Completion report

Report PASS/BLOCKED, evidence, tests, and changed files.
