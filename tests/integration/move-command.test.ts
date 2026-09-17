import { allocateEntityId, START_ENTITY_ID, tilesToFixed } from '@rts/shared'
import { createSimulation, createWorld, Owner, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { SEEDS, TEST_IDENTITY } from '../fixtures/index.js'

function makeWorldWithUnits(owners: readonly number[]): ReturnType<typeof createWorld> {
  const world = createWorld()
  let next = START_ENTITY_ID
  for (const owner of owners) {
    const allocated = allocateEntityId(next)
    next = allocated.nextEntityId
    world.createEntity(allocated.id)
    world.store(Position).set(allocated.id, { x: 0, y: 0 })
    world.store(Owner).set(allocated.id, { owner })
  }
  return world
}

function moveCommand(playerId: number, unitIds: readonly number[], x: number, y: number, sequence = 1) {
  return {
    tick: 1,
    playerId,
    sequence,
    intent: { type: 'MOVE' as const, payload: { unitIds, x, y } }
  }
}

describe('MOVE command validation', () => {
  it('moves own units with the first unit exactly on the target', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: makeWorldWithUnits([0, 0, 0])
    })
    const units = sim.inspectState().world.aliveIds()
    const target = tilesToFixed(3)

    sim.step([moveCommand(0, units, target, target)])

    const after = sim.inspectState()
    const sorted = [...units].sort((a, b) => a - b)
    expect(after.world.store(Position).get(sorted[0]!)).toEqual({ x: target, y: target })
    for (const unit of sorted.slice(1)) {
      expect(after.world.store(Position).get(unit)).not.toEqual({ x: target, y: target })
    }
  })

  it('rejects a command from a non-owner without mutating state beyond the tick advance', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveNonOwner,
      identity: TEST_IDENTITY,
      initialWorld: makeWorldWithUnits([0])
    })
    const control = createSimulation({
      seed: SEEDS.integration.moveNonOwner,
      identity: TEST_IDENTITY,
      initialWorld: makeWorldWithUnits([0])
    })
    const unit = sim.inspectState().world.aliveIds()[0]!

    const result = sim.step([moveCommand(1, [unit], 100, 100)])
    control.step([])

    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]!.code).toBe('NOT_OWNER')
    expect(sim.hashState()).toBe(control.hashState())
    expect(sim.inspectState().world.store(Position).get(unit)).toEqual({ x: 0, y: 0 })
  })

  it('rejects a command targeting a nonexistent entity without mutating state', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveMissing,
      identity: TEST_IDENTITY,
      initialWorld: makeWorldWithUnits([0])
    })
    const control = createSimulation({
      seed: SEEDS.integration.moveMissing,
      identity: TEST_IDENTITY,
      initialWorld: makeWorldWithUnits([0])
    })

    const result = sim.step([moveCommand(0, [999], 100, 100)])
    control.step([])

    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]!.code).toBe('ENTITY_UNAVAILABLE')
    expect(sim.hashState()).toBe(control.hashState())
  })

  it('rejects empty and oversized unit selections', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveEmptyOversize,
      identity: TEST_IDENTITY,
      initialWorld: makeWorldWithUnits([0])
    })
    const control = createSimulation({
      seed: SEEDS.integration.moveEmptyOversize,
      identity: TEST_IDENTITY,
      initialWorld: makeWorldWithUnits([0])
    })
    const big = Array.from({ length: 257 }, (_, i) => i + 1)

    expect(sim.step([moveCommand(0, [], 1, 1)]).rejected).toHaveLength(1)
    expect(sim.step([moveCommand(0, big, 1, 1)]).rejected).toHaveLength(1)
    control.step([])
    control.step([])

    expect(sim.hashState()).toBe(control.hashState())
  })

  it('rejects fractional target coordinates as INVALID_PAYLOAD without mutating state', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveFractional,
      identity: TEST_IDENTITY,
      initialWorld: makeWorldWithUnits([0])
    })
    const control = createSimulation({
      seed: SEEDS.integration.moveFractional,
      identity: TEST_IDENTITY,
      initialWorld: makeWorldWithUnits([0])
    })
    const unit = sim.inspectState().world.aliveIds()[0]!

    const result = sim.step([moveCommand(0, [unit], 4200.5, 3800.25)])
    control.step([])

    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]!.code).toBe('INVALID_PAYLOAD')
    expect(sim.hashState()).toBe(control.hashState())
    expect(sim.inspectState().world.store(Position).get(unit)).toEqual({ x: 0, y: 0 })
  })

  it('is deterministic: same seed + commands produce the same hash', () => {
    const build = () =>
      createSimulation({
        seed: SEEDS.integration.moveDeterministic,
        identity: TEST_IDENTITY,
        initialWorld: makeWorldWithUnits([0, 1])
      })
    const a = build()
    const b = build()
    const unitA = a.inspectState().world.aliveIds()[0]!
    const unitB = a.inspectState().world.aliveIds()[1]!

    for (let i = 0; i < 50; i += 1) {
      a.step([
        moveCommand(0, [unitA], tilesToFixed(i), tilesToFixed(i)),
        moveCommand(1, [unitB], tilesToFixed(i * 2), tilesToFixed(i * 2))
      ])
      b.step([
        moveCommand(0, [unitA], tilesToFixed(i), tilesToFixed(i)),
        moveCommand(1, [unitB], tilesToFixed(i * 2), tilesToFixed(i * 2))
      ])
      expect(b.hashState()).toBe(a.hashState())
    }
  })
})
