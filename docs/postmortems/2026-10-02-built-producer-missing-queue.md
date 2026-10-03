---
status: closed
classe: coverage
barreira: QH.28.01
regressao:
  - tests/simulation/economy/building-construction.test.ts
---

# Built Producer Missing Queue

## Summary

The first real-server regression of the unified `regression` fixture exposed
that a Monastery constructed during a match reached `COMPLETED` but could not
show or accept its research queue. Pre-seeded producer buildings worked, so the
defect was hidden by the former `research` scenario.

## Symptom

After Castle II and Monastery construction, the browser selected a completed
Monastery showing HP and `Ready`, but no production/research panel was present.
The reproduction used `scenario=regression`, passive aggression, and the real
HUD construction flow.

## Root cause

`packages/simulation/src/systems/construction-system.ts` updated the Building
and Health components when construction completed, but did not create the
`Production` component for buildings whose game-data definition supports
production or research. Demo bootstrap seeded that component for authored
buildings, masking the missing dynamic-construction path.

## What we missed

Construction tests verified status, health, position, pause/resume, and replay,
but did not assert that a dynamically completed producer was functionally ready.
The former research E2E scenario also started with a pre-seeded Monastery and
therefore skipped the authoritative construction-to-research transition.

## Fix

Completion now initializes an empty `Production` queue when the completed
building definition can produce or research. The completion logic is isolated
in a named helper so the construction system remains within the repository's
function-size quality limit.

## Regression

`tests/simulation/economy/building-construction.test.ts` now builds a Monastery
after a completed Castle II fixture and asserts that completion creates
`Production({ queue: [] })`.

## Prevention

The unified browser fixture progresses from Castle I through construction before
testing research. The simulation regression prevents future producer buildings
from becoming visually complete but functionally inert.

## Verification

- `corepack pnpm exec vitest run tests/simulation/economy/building-construction.test.ts` — PASS
- `corepack pnpm run typecheck` — PASS
- `corepack pnpm run lint` — PASS
- Original browser reproduction in `tests/e2e/economy/research-playable.spec.ts` — PASS
- Chromium and Firefox functional E2E suites — PASS
