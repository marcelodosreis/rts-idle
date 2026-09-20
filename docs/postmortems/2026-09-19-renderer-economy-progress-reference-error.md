---
status: open
classe: presentation
barreira: null
regressao:
  - tests/unit/unit-economy.test.ts
---

## Summary

Issuing a mining command in the browser could freeze the rendered pawn because rendering the economy progress bar threw during `renderer.present()`.

## Symptom

The pawn appeared frozen after a mining command, although the authoritative simulation continued to advance.

## Root cause

`drawEconomyBar` referenced helpers that were re-exported from its module without local imports. Re-exports do not create local bindings, so the renderer entrypoint threw a reference error.

## What we missed

The helper unit tests did not call the renderer entrypoint that consumes them, and the economy E2E did not reliably exercise the visible progress bar path.

## Fix

`packages/renderer/src/unit-economy.ts` imports the helpers locally before using them in `drawEconomyBar`.

## Regression

`tests/unit/unit-economy.test.ts` calls `drawEconomyBar` with a gathering payload and asserts visibility, drawing calls, and the progress-derived fill width.

## Prevention

Renderer regressions now exercise the public drawing entrypoint directly, while the economy browser scenario covers the authoritative mining path.

## Verification

`pnpm exec vitest run tests/unit/unit-economy.test.ts tests/unit/progress-bar.test.ts` and the focused Chromium economy E2E passed; `pnpm run verify` and `pnpm run verify:browser` also passed.
