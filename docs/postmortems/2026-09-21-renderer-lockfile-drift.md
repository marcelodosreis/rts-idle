---
status: open
classe: completion-gate
barreira: null
regressao:
  - tests/architecture/renderer-lockfile-consistency.test.ts
---

# Renderer Lockfile Drift

## Summary

The PR CI pipeline failed during dependency installation on 2026-09-21. The
frozen pnpm install rejected the committed lockfile before linting, typechecking,
or any test job could run.

## Symptom

GitHub Actions reported `ERR_PNPM_OUTDATED_LOCKFILE` for
`packages/renderer/package.json`: the lockfile still declared
`@rts/game-data@workspace:*` after that dependency had been removed from the
renderer manifest. All dependent CI jobs were skipped.

## Root cause

The renderer dependency authority refactor removed `@rts/game-data` from the
package manifest without regenerating `pnpm-lock.yaml`. Lockfile regeneration
also exposed matching stale importer entries for the server and web manifests.

## What we missed

Local validation reused an existing dependency installation and ran tests,
typechecking, linting, and builds without first exercising a clean
`pnpm install --frozen-lockfile`. The changed package manifest did not have a
lockfile consistency regression test.

## Fix

Regenerated `pnpm-lock.yaml` with pnpm 10.33.2 so the renderer, server, and web
importer dependencies match their current manifests.

## Regression

`tests/architecture/renderer-lockfile-consistency.test.ts` compares the renderer
manifest dependencies with its lockfile importer. It fails when a dependency is
added or removed from only one of those sources.

## Prevention

The permanent architecture regression test catches the specific renderer drift
that blocked CI. The original CI command, `pnpm install --frozen-lockfile`, is
now part of this fix's focused validation and remains the repository-wide gate
for all workspace importers.

## Verification

- `CI=true pnpm install --frozen-lockfile`
- `pnpm exec vitest run tests/architecture/renderer-lockfile-consistency.test.ts`
- `pnpm run lint`
- `pnpm run verify`
