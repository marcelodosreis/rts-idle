# QH.27.01 — Deterministic E2E and faster pipeline

**Status:** in progress
**Phase:** Quality Hardening / E2E determinism and runtime
**Dependencies:** QH.26.01

## Objective

Remove every timing-dependent E2E pattern so browser validation is deterministic
by construction, and cut pipeline wall-clock without increasing CI minutes.

## Why

Random red pipelines force re-runs and re-pushes, wasting time and CI minutes;
flaky retries also hide real failures.

## Scope

- `tests/e2e/**`, `playwright.config.ts`, `tools/e2e/**`, `.github/workflows/ci.yml`
- Small deterministic debug getters in `apps/web/src`
- `docs/engineering-standard.md` and related docs

## Read first

- `tests/e2e/support/settle.ts`
- `playwright.config.ts`
- `tests/e2e/web-routes.spec.ts`
- `docs/postmortems/2026-10-01-web-route-transition-starvation.md`
- `docs/postmortems/2026-10-01-queue-card-animation-measurement.md`

## Contract

- No E2E test may wait on wall-clock time; every wait polls an observable state.
- No E2E test may measure an element while it animates; motion is reduced
  globally, with one explicit animation spec that opts into `no-preference`.
- No E2E test may assert exact rendered positions or "nothing changed" by time;
  use authoritative/tick state with an epsilon.
- Readiness uses `waitForMatchReady`, never `getTick() > 0` alone.
- CI runs E2E with `retries: 0`; a retry can never hide a flake.
- Stability is proven by repeating only the curated flaky subset via
  `pnpm run test:e2e:flaky`, not the whole suite.

## Acceptance Criteria

- [ ] No `waitForTimeout` remains in `tests/e2e`.
- [ ] No E2E assertion depends on a CSS animation's transient geometry.
- [ ] CI functional lane runs with `use.reducedMotion: 'reduce'` and `retries: 0`.
- [ ] `pnpm run test:e2e:flaky` passes twice consecutively on Chromium and Firefox.
- [ ] `pnpm run verify` passes.

## Validation

- `pnpm run test:e2e:flaky`
- `pnpm run verify`
- `pnpm run test:architecture`

## Progress

E2E now waits on observable state and authoritative ticks, measures settled
layout under reduced motion, and runs with `retries: 0`; the curated flaky
subset passed twice consecutively on Chromium and Firefox. Isolated-port
parallel workers remain open pending runner-CPU validation.
