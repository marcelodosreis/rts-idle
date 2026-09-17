import { allocateEntityId, START_ENTITY_ID } from '@rts/shared'
import { createSimulation, createWorld, Owner, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY } from '../fixtures/index.js'

function worldWithUnits(count: number): ReturnType<typeof createWorld> {
  const world = createWorld()
  let next = START_ENTITY_ID
  for (let i = 0; i < count; i += 1) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, { x: 0, y: 0 })
    world.store(Owner).set(allocated.id, { owner: 0 })
  }
  return world
}

function moveCommand(unitIds: readonly number[], x: number, y: number) {
  return { tick: 1, playerId: 0, sequence: 1, intent: { type: 'MOVE' as const, payload: { unitIds, x, y } } }
}

describe('group MOVE formation destinations', () => {
  it('spreads multiple units around the target instead of stacking', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.formationSpread,
      identity: TEST_IDENTITY,
      initialWorld: worldWithUnits(4)
    })
    const units = sim.inspectState().world.aliveIds()
    const target = 10_000

    sim.step([moveCommand(units, target, target)])

    const after = sim.inspectState()
    const positions = units.map((id) => after.world.store(Position).get(id))
    for (const pos of positions) {
      expect(pos).toBeDefined()
    }
    const keys = new Set(positions.map((p) => `${p!.x},${p!.y}`))
    expect(keys.size).toBe(units.length)
  })

  it('places the first unit exactly on the click and the rest nearby', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.formationFirstOnClick,
      identity: TEST_IDENTITY,
      initialWorld: worldWithUnits(4)
    })
    const units = sim.inspectState().world.aliveIds()
    const target = 5_000

    sim.step([moveCommand(units, target, target)])

    const after = sim.inspectState()
    const sorted = [...units].sort((a, b) => a - b)
    const first = after.world.store(Position).get(sorted[0]!)
    expect(first).toEqual({ x: target, y: target })

    for (const id of sorted.slice(1)) {
      const pos = after.world.store(Position).get(id)!
      expect(pos).not.toEqual({ x: target, y: target })
    }
  })

  it('moves a single unit exactly to the target', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.formationSingle,
      identity: TEST_IDENTITY,
      initialWorld: worldWithUnits(1)
    })
    const unit = sim.inspectState().world.aliveIds()[0]!

    sim.step([moveCommand([unit], 123, 456)])

    expect(sim.inspectState().world.store(Position).get(unit)).toEqual({ x: 123, y: 456 })
  })

  it('is deterministic for the same seed and commands', () => {
    const build = () =>
      createSimulation({
        seed: SEEDS.integration.formationDeterministic,
        identity: TEST_IDENTITY,
        initialWorld: worldWithUnits(6)
      })
    const a = build()
    const b = build()
    const units = a.inspectState().world.aliveIds()

    a.step([moveCommand(units, 20_000, 30_000)])
    b.step([moveCommand(units, 20_000, 30_000)])

    expect(b.hashState()).toBe(a.hashState())
  })
})
