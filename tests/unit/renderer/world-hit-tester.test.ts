import { describe, expect, it } from 'vitest'
import { createWorldHitTester } from '../../../packages/renderer/src/input/world-hit-tester.js'

describe('world hit tester', () => {
  it('uses the documented unit, mineral, building, ground precedence', () => {
    const tester = createWorldHitTester({
      mineralNodeAt: () => 3,
      unitAt: () => 2,
      buildingAt: () => 1
    })

    expect(tester.targetAt({ x: 10, y: 20 })).toEqual({ kind: 'unit', id: 2 })
  })

  it('falls through each target type before returning ground', () => {
    const tester = createWorldHitTester({
      mineralNodeAt: () => null,
      unitAt: () => null,
      buildingAt: () => 7
    })
    expect(tester.targetAt({ x: 10, y: 20 })).toEqual({ kind: 'building', id: 7 })

    const ground = createWorldHitTester({
      mineralNodeAt: () => null,
      unitAt: () => null,
      buildingAt: () => null
    })
    expect(ground.targetAt({ x: 10, y: 20 })).toEqual({ kind: 'ground', position: { x: 10, y: 20 } })
  })
})
