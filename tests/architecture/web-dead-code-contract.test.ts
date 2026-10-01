import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const runtime = readFileSync(
  new URL('../../apps/web/src/features/match/services/match-session-runtime.ts', import.meta.url),
  'utf8'
)
const sessionHook = readFileSync(
  new URL('../../apps/web/src/features/match/hooks/use-match-session.ts', import.meta.url),
  'utf8'
)
const controller = readFileSync(
  new URL('../../apps/web/src/features/match/services/match-interaction-controller.ts', import.meta.url),
  'utf8'
)
const unitLayer = readFileSync(new URL('../../packages/renderer/src/units/layer.ts', import.meta.url), 'utf8')
const inputTypes = readFileSync(new URL('../../packages/renderer/src/input/input-types.ts', import.meta.url), 'utf8')
const camera = readFileSync(new URL('../../packages/renderer/src/input/camera-controller.ts', import.meta.url), 'utf8')
const worldObjects = readFileSync(new URL('../../packages/renderer/src/world/object-layer.ts', import.meta.url), 'utf8')

describe('web and renderer dead-code contract', () => {
  it('does not reintroduce removed renderer symbols', () => {
    for (const source of [unitLayer, inputTypes, camera, worldObjects]) {
      expect(source).not.toMatch(/\bpositionsPixels\b/)
      expect(source).not.toMatch(/\bCameraState\b/)
      expect(source).not.toMatch(/\bpointFromData\b/)
      expect(source).not.toMatch(/allowMiddleDrag/)
      expect(source).not.toMatch(/normalizedBuildings/)
    }
    expect(unitLayer).not.toMatch(/\bhas\(id: number\)/)
  })

  it('keeps one unit-state map and one selection source in the session', () => {
    expect(runtime).toContain('unitStates: new Map')
    expect(runtime).not.toContain('unitOwners')
    expect(runtime).not.toContain('unitKinds')
    expect(runtime).toContain('selectedIds')
    expect(runtime).toContain('selectUnits(ids)')
    expect(runtime).toContain('selectConstruction(id)')
    expect(runtime).toContain('selectResource(id)')
    expect(sessionHook).not.toContain('runtime.selectedIds =')
    expect(sessionHook).not.toContain('runtime.selectedConstructionId =')
    expect(sessionHook).not.toContain('runtime.selectedMineralId =')
    expect(controller).toContain('unitStates')
    expect(controller).not.toContain('unitOwners')
  })
})
