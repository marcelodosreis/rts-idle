---
status: open
classe: presentation
barreira: null
regressao:
  - tests/e2e/hud-commands.spec.ts
  - tests/e2e/hud-order-states.spec.ts
  - tests/e2e/control-click-attack.spec.ts
  - tests/e2e/economy-playable.spec.ts
---

# E2E Interaction Contention

## Symptom

The CI E2E job completed most tests but reported one failure and three flaky
tests in Chromium while running the full fallback suite with two Playwright
workers. The failures involved attack damage, attack-move state, preserved
carrying cargo, and control-click selection.

## Root cause

The affected tests combine real-time simulation, browser input, and short UI
observation windows. Running multiple browser workers increased CPU and event
loop contention on the hosted runner, allowing the browser assertion window to
miss an authoritative state transition even though the same scenarios passed
serially.

## What we missed

The full E2E command overrode the Playwright CI configuration with two workers
without first proving that timing-sensitive interaction tests were isolated
from runner contention. The tests also relied on visual state windows instead
of consistently waiting on authoritative transitions.

## Fix

- The CI uses one Playwright worker for each timing-sensitive E2E job.
- The worker count is configurable through `E2E_WORKERS` instead of conflicting
  package-script and Playwright settings.
- Functional and renderer-performance E2E jobs run in parallel, so reducing
  browser concurrency does not serialize the entire pipeline.
- The affected tests remain required and are validated in both browsers.

## Regression

The functional E2E gate runs the four affected interaction files together in
Chromium and Firefox with the CI worker setting. The performance gate runs the
renderer benchmark independently. Both jobs must finish without failed or flaky
results.

## Prevention

Real-time browser tests must use authoritative state polling for transitions,
and worker increases require repeated full-suite validation on the hosted CI
runner rather than only local execution.

## Verification

- `pnpm run test:e2e:focused tests/e2e/hud-commands.spec.ts tests/e2e/hud-order-states.spec.ts tests/e2e/control-click-attack.spec.ts tests/e2e/economy-playable.spec.ts --project=chromium --project=firefox --workers=1`
- `E2E_WORKERS=1 pnpm run test:e2e:fast`
- `E2E_WORKERS=1 pnpm run test:e2e:perf`
- `E2E_WORKERS=1 pnpm run test:e2e:all`
