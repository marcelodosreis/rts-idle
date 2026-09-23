---
status: open
classe: presentation
barreira: null
regressao:
  - tests/architecture/package-dependencies.test.ts
---

# Diagnostics Architecture Exclusion

## Summary

The pull request pipeline failed in the architecture dependency barrier after the browser diagnostics tools were consolidated into `features/laboratory/diagnostics/`. The failure blocked the PR even though the determinism import was an intentional browser-only diagnostic dependency.

## Symptom

CI reported one violation in `tests/architecture/package-dependencies.test.ts`:

`apps/web/src/features/laboratory/diagnostics/DeterminismFeature.tsx: imports @rts/simulation/fixtures`

## Root cause

The architecture test excluded the former diagnostic directories `det`, `perf`, and `determinism`. The feature restructure moved those tools into one `diagnostics` directory, but the exclusion list was not updated.

## What we missed

The restructure validation covered TypeScript, lint, build, and focused browser tests, but did not run the architecture suite after changing the diagnostic directory boundary. The acceptance criterion should have required every moved diagnostic harness to remain covered by the intended architecture exception.

## Fix

Updated `tests/architecture/package-dependencies.test.ts` to exclude the consolidated `diagnostics` directory instead of the removed directory names.

## Regression

The `web imports only its allowed @rts packages` test now scans the current web structure while explicitly excluding the consolidated browser-only diagnostics harness. It fails if the directory is renamed or the exception is removed without a corresponding architecture decision.

## Prevention

Architecture validation is part of the PR completion gate. Future feature-directory moves must update the architecture test's boundary metadata in the same change and run `pnpm run test:architecture` before pushing.

## Verification

- `pnpm exec vitest run tests/architecture/package-dependencies.test.ts`
- `pnpm run test:architecture`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run build`
