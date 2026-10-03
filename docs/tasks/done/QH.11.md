# QH.11 — Toggle CI parallelism (historical alias: QUAL-011)

**Status:** done
**Phase:** Quality Hardening / Structural
**Dependencies:** QH.09, QH.10 (existing CI parallelism predates this reduced batch)

## Objective

Record the existing parallel test execution already provided by CI.

## Scope

- `playwright.config.ts` — parallelization config
- `.github/workflows/ci.yml` — CI integration

## Acceptance Criteria

- [x] Tests run in parallel
- [x] No flaky tests from parallelization

## Validation

- CI run

## Completion Report

The existing workflow runs code-test suites as a matrix and runs functional and
performance browser groups as independent browser/group matrix jobs. Playwright
also has `fullyParallel: true`; each CI group intentionally uses one worker to
preserve deterministic resource usage. No new parallelism implementation was
needed in this batch.
