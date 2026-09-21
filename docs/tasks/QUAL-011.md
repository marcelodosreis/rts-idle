# QUAL-011 — Flip paralelismo CI

**Status:** pending
**Phase:** Quality Hardening / Estrutural
**Dependencies:** QUAL-009, QUAL-010

## Objective

Enable parallel test execution in CI.

## Scope

- `playwright.config.ts` — parallelization config
- `.github/workflows/ci.yml` — CI integration

## Acceptance Criteria

- [ ] Tests run in parallel
- [ ] No flaky tests from parallelization

## Validation

- CI run
