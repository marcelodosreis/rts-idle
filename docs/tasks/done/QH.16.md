# QH.16 — Output hygiene (historical alias: QUAL-016)

**Status:** done
**Phase:** Quality Hardening / Fundação
**Dependencies:** none

## Objective

Ensure all test runners produce compact, LLM-friendly output without hiding
failure diagnostics or creating unnecessary artifacts.

## Scope

- `playwright.config.ts` — use the dot reporter, suppress normal web server
  stdout, and preserve stderr
- `vitest.config.ts` — use the dot reporter for every Vitest suite
- `tests/unit/test-output-hygiene.test.ts` — configuration guard
- `docs/ai/EXECUTION_PROTOCOL.md` — test output policy
- `docs/testing/manual-smoke.md` — local test commands and output expectations

## Acceptance Criteria

- [x] Guard fails with the old reporter configuration (RED)
- [x] Guard passes with compact reporters
- [x] No html/trace/screenshot/video in playwright config
- [x] No text coverage reporter in vitest config
- [x] Vitest unit, integration, simulation, contract, order, determinism,
  architecture, and invariant suites use compact output
- [x] Playwright focused and complete runs use compact output
- [x] Failed tests retain their error details and stack traces
- [x] CI continues to run the complete Chromium and Firefox E2E gate

## Validation

- `pnpm run test:unit`
- `pnpm run verify`
- `pnpm run verify:browser`
