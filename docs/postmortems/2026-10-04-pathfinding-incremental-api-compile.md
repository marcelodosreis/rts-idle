---
status: open
classe: serialization
barreira: null
regressao:
  - tests/architecture/public-api.test.ts
---

# Incremental Pathfinding API Compile Failure

## Summary

While extending the pathfinding public API for `P3.02.01`, the package stopped
compiling: `ResolvedDestination` was not imported, and the index exported the
same A* and grid symbols twice. The focused tests could not transform the
package until the exports and imports were corrected.

## Symptom

`@rts/pathfinding` typecheck reported a missing `ResolvedDestination` name and
duplicate identifiers. Vitest then failed all pathfinding and public API suites
before running any test.

## Root cause

The incremental API patch reordered the index exports without removing the
previous export block, and the A* caller was not updated when the shared search
geometry type became explicit. The helper cleanup also temporarily exceeded the
repository parameter limit.

## What we missed

The smallest focused typecheck and Biome check were not run immediately after
the multi-file API patch. The public API architecture test should be part of
the first validation command whenever an export surface changes.

## Fix

`packages/pathfinding/src/index.ts` now has one ordered export for each module;
`astar.ts` imports `ResolvedDestination`; and `incremental.ts` groups pending
collections into one typed value so the parameter limit remains satisfied.

## Regression

`tests/architecture/public-api.test.ts` imports the pathfinding namespace and
asserts the documented search exports. Without the fix, the module transform
fails before the assertions run.

## Prevention

Run package typecheck, Biome, and the public API architecture test immediately
after public API edits. Keep export blocks ordered and non-duplicated in the
same patch that introduces the new API.

## Verification

`corepack pnpm --filter @rts/pathfinding run typecheck`, the focused 21-test
pathfinding/public API run, and `corepack pnpm run verify:fast` pass on Node
`v24.21.0`.
