import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const WORKSPACE_ROOT = process.cwd()

function expectPresent(path: string): void {
  expect(existsSync(join(WORKSPACE_ROOT, path)), `${path} must exist`).toBe(true)
}

function expectAbsent(path: string): void {
  expect(existsSync(join(WORKSPACE_ROOT, path)), `${path} was moved and must not be restored`).toBe(false)
}

describe('physical layout', () => {
  it('keeps the documented domain roots present', () => {
    for (const path of [
      'packages/shared/src/domain',
      'packages/shared/src/maps',
      'packages/shared/src/primitives',
      'packages/shared/src/rng',
      'packages/renderer/src/input',
      'packages/renderer/src/units',
      'packages/renderer/src/world',
      'packages/simulation/src/commands',
      'packages/simulation/src/ecs',
      'packages/simulation/src/invariants',
      'packages/simulation/src/resources',
      'packages/simulation/src/snapshot',
      'packages/simulation/src/systems',
      'apps/server/src/bootstrap',
      'apps/server/src/content',
      'apps/server/src/sessions',
      'apps/server/src/transport',
      'apps/web/src/features/laboratory',
      'apps/web/src/features/match'
    ]) {
      expectPresent(path)
    }
  })

  it('keeps the test roots organized by suite', () => {
    for (const path of [
      'tests/architecture',
      'tests/contracts',
      'tests/determinism',
      'tests/e2e',
      'tests/fixtures/simulation',
      'tests/fuzz',
      'tests/integration',
      'tests/invariants',
      'tests/orders',
      'tests/simulation/economy',
      'tests/unit/tools',
      'tests/unit/web'
    ]) {
      expectPresent(path)
    }
  })

  it('keeps only migration-proven legacy paths absent', () => {
    for (const path of [
      'apps/server/src/demo.ts',
      'apps/server/src/demo/scenarios.ts',
      'apps/server/src/match-bootstrap.ts',
      'packages/renderer/src/renderer.ts',
      'packages/renderer/src/render-layers.ts',
      'packages/renderer/src/terrain-layer.ts',
      'packages/shared/src/fixed.ts',
      'packages/shared/src/ids.ts',
      'packages/shared/src/map.ts',
      'packages/simulation/src/formation.ts',
      'tests/fixtures/commands.ts',
      'tests/fixtures/identity.ts',
      'tests/fixtures/world.ts',
      'tests/e2e/settle.ts',
      'tests/simulation/basic-combat.test.ts',
      'tests/unit/asset-pipeline.test.ts'
    ]) {
      expectAbsent(path)
    }
  })
})
