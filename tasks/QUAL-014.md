# QUAL-014 — Coverage ratchet

**Status:** pending
**Phase:** Quality Hardening / Condicionado
**Dependencies:** QUAL-016

## Objective

Enforce coverage thresholds via ratchet.

## Scope

- `package.json` — coverage config
- `vitest.config.ts` — thresholds
- `.github/workflows/ci.yml` — CI integration

## Acceptance Criteria

- [ ] Coverage thresholds enforced
- [ ] Tests fail if coverage drops

## Validation

- `pnpm run test:unit`
