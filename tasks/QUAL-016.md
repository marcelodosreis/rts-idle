# QUAL-016 — Higiene de saída

**Status:** pending
**Phase:** Quality Hardening / Fundação
**Dependencies:** none

## Objective

Ensure no test runner produces artifacts or verbose output.

## Scope

- `playwright.config.ts` — remove html reporter, trace, screenshot, video
- `vitest.config.ts` — remove text coverage reporter
- `tests/unit/test-output-hygiene.test.ts` — guard

## Acceptance Criteria

- [ ] Guard fails with current config (RED)
- [ ] After fix: guard passes
- [ ] No html/trace/screenshot/video in playwright config
- [ ] No text coverage reporter in vitest config

## Validation

- `pnpm run test:unit`
