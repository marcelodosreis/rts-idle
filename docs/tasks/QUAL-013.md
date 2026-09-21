# QUAL-013 — Gate E2E por caminho

**Status:** pending
**Phase:** Quality Hardening / Condicionado
**Dependencies:** QUAL-002, QUAL-005

## Objective

Gate E2E tests by file path changes.

## Scope

- `tools/e2e-required.ts` — detection script
- `.github/workflows/ci.yml` — CI integration
- `.husky/` — pre-commit hook

## Acceptance Criteria

- [ ] E2E tests run only when relevant files change
- [ ] Pre-commit hook warns about missing E2E

## Validation

- CI run
