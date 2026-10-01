# QH.26.01 — Deterministic CI and E2E reliability

**Status:** done
**Phase:** Quality Hardening / CI reliability
**Dependencies:** QH.25

## Objective

Preserve the complete validation suite while reducing normal CI wall-clock time
and preventing hidden flaky E2E passes.

## Why

The same tree passed PR CI but failed on the post-merge `main` run, blocking
release without diagnostic artifacts.

## Scope

- `.github/workflows/ci.yml`
- `playwright.config.ts`
- Route loading/error presentation and affected E2E tests
- Required postmortem and status records

## Read first

- `.github/workflows/ci.yml`
- `playwright.config.ts`
- `apps/web/src/routes/router.tsx`
- `apps/web/src/shared/components/LaboratoryLayout.tsx`
- `apps/web/src/routes/laboratory-route-loader.ts`
- `tests/e2e/web-routes.spec.ts`
- `docs/postmortems/2026-09-30-laboratory-navigation-lazy-route.md`

## Contract

- Static, code, functional Chromium, functional Firefox, and performance browser coverage remain required for release.
- Code suites may run in parallel jobs, but every existing command must execute and aggregate into one required gate.
- Functional Chromium and Firefox may run in separate jobs with isolated servers; neither browser is optional.
- Performance validation may run in parallel with functional validation after static/code gates succeed.
- A test that passes only after a retry is a failed CI result, not a green result.
- Failed E2E jobs publish trace, screenshot, and test-result artifacts without changing the green-path duration.
- The Laboratory route must show its header/title while child content loads, and route failures must show a visible recovery state instead of a blank/loading-only page.

## Design

- Use GitHub Actions matrices for parallel suites; aggregate matrix results through the job dependency graph so release still requires every lane.
- Keep one Playwright worker per browser lane to preserve deterministic server/session isolation.
- Configure diagnostics only for retries/failures and enable flaky-test failure detection only in CI.
- Keep route layout presentation-only: the layout owns header/navigation and an inner boundary owns feature content; no simulation or transport changes.
- Use typed React error/loading states and the existing design system; do not add a generic utility layer.

## Tests and validation

- `pnpm run test:e2e:focused tests/e2e/web-routes.spec.ts --list`
- `pnpm run test:e2e:focused tests/e2e/web-routes.spec.ts --project=chromium --project=firefox --workers=1`
- `pnpm run verify`
- `pnpm run test:e2e:fast`
- CI must pass static, code, both functional browser lanes, both performance browser lanes, and release prerequisites.

## Acceptance Criteria

- [x] Existing tests remain present and all required lanes execute.
- [x] Normal CI wall-clock is lower than the current serial browser flow.
- [x] Retry-only passes are reported as failures.
- [x] Failed E2E runs provide actionable artifacts.
- [x] Laboratory navigation has a deterministic regression and visible loading/error behavior.
- [x] Local and CI gates pass; no unrelated files or behavior change.

## Validation

- `pnpm run verify` — PASS (typecheck, lint, unit 394, integration 24, simulation 117, contracts 23, orders 6, determinism 6, architecture 645, invariants 16, build).
- `pnpm run test:e2e -- --project=chromium --grep-invert @perf` — PASS (115/115).
- `pnpm run test:e2e -- --project=firefox --grep-invert @perf` — PASS (115/115).
- `pnpm run test:e2e -- --project=chromium --workers=1 --grep @perf` — PASS (1/1).
- `pnpm run test:e2e -- --project=firefox --workers=1 --grep @perf` — PASS (1/1).
- Focused readiness/route regression set (10 specs, both browsers) — PASS (64/64).
- CI static, code, functional-browser, and performance-browser gates — PASS (run `36822886466`, PR #42).

Two browser lanes must run sequentially on a single local machine; running them
concurrently starves CPU and makes `firstFramePresented` time out. CI runs each
browser in its own matrix runner, so lanes do not contend.
