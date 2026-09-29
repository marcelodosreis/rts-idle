# QH.14 — Coverage ratchet (historical alias: QUAL-014)

**Status:** pending
**Phase:** Quality Hardening / Conditional
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
