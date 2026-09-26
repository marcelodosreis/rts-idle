# QH.11 — Toggle CI parallelism (historical alias: QUAL-011)

**Status:** pending
**Phase:** Quality Hardening / Structural
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
