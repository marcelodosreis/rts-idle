# QH.20 — Web App Function Decomposition (historical alias: QUAL-020)

**Status:** done
**Phase:** Quality Hardening / Fundação
**Dependencies:** QUAL-019

## Objective

Decompose the React app so every function meets the ≤50-line bar and every
source file stays ≤400 lines, removing the `apps/web/**` warning override and
all line/complexity suppressions.

## Scope

- `apps/web/src/features/match/lifecycle/*` (session bootstrap split into hooks)
- `apps/web/src/features/match/laboratory-menu/*` (section components)
- `apps/web/src/features/laboratory/browser/*` (browse view, controller, canvas, sidebar)
- `apps/web/src/features/laboratory/editor/*` (data, controller, matrix, paint, overlays, toolbar, hooks)
- `apps/web/src/features/laboratory/report/*`, `diagnostics/*`
- `biome.jsonc` — removed the `apps/web/**` warn override

## Acceptance Criteria

- [x] Every `apps/web` function is ≤50 lines; source files ≤400 (except generated/tests)
- [x] `noExcessiveLinesPerFunction` and `noExcessiveLinesPerFile` back to `error` for `apps/web`
- [x] No line/complexity suppressions remain
- [x] E2E green (including the DevTools-menu DOM-id regression; see postmortem)
- [x] `pnpm run verify` green

## Validation

- `pnpm run lint`
- `pnpm run test:unit`
- `pnpm run test:e2e:all`
- `pnpm run verify`

## Completion Report

PASS. Split the session hook into state/connection/actions hooks, decomposed the
laboratory menu, browser, report, diagnostics, and editor into focused modules
(`terrain-editor-{data,controller,matrix,paint,overlays,level}`), removed all
suppressions, and returned the rules to `error`. Full Chromium + Firefox E2E
green after restoring the DevTools content ids.
