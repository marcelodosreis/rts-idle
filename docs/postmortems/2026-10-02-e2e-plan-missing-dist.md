---
status: open
classe: environment
barreira: QH.27.01
regressao:
  - tests/architecture/e2e-ci-artifacts.test.ts
---

# E2E plan missing build artifacts

## Summary

The first CI run of the automatic E2E shard planner failed in `Prepare E2E plan`
before any browser job started. Test discovery imports workspace packages from
their built `dist` files, but the preparation job did not download the build
artifact produced by `static_gate`.

## Symptom

The workflow reported `Cannot find module .../node_modules/@rts/shared/dist/index.js`
and skipped all functional and performance E2E jobs.

## Root cause

`prepare_e2e` ran Playwright discovery immediately after dependency installation.
Unlike the E2E execution jobs, it had no `actions/download-artifact` step for the
`dist` artifact, so workspace package exports pointed at files absent from the
runner.

## What we missed

The implementation validated `prepare-plan.ts` locally in a workspace that still
had build output, but did not test the clean CI ordering where a fresh runner
must download `dist` before importing E2E specs. The acceptance criteria lacked a
workflow-level preparation artifact check.

## Fix

`prepare_e2e` now downloads the `dist` artifact before running test discovery in
`.github/workflows/ci.yml`.

## Regression

`tests/architecture/e2e-ci-artifacts.test.ts` asserts that the preparation job
downloads `dist` before the `Generate E2E plan` step.

## Prevention

The CI workflow barrier now protects the build-artifact prerequisite, and the
preparation job continues to use the same built package surface as browser jobs.

## Verification

- `pnpm run test:architecture` — passes, including the regression.
- `pnpm run verify` — passes after the correction.
- Original CI failure reproduced from run `37044859740` and traced to the missing
  artifact download.
