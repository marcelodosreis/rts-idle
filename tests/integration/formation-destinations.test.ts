import { createSimulation, Movement, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { buildMoveCommand, SEEDS, TEST_IDENTITY, worldWithUnits } from '../fixtures/index.js'

/** Steps the sim until every given unit has no pending Movement order. */
function stepUntilArrived(sim: ReturnType<typeof createSimulation>, ids: readonly number[], maxTicks = 400): void {
  for (let tick = 0; tick < maxTicks; tick += 1) {
    sim.step()
    const movements = sim.inspectState().world.store(Movement)
    if (ids.every((id) => movements.get(id) === undefined)) {
      return
    }
  }
  throw new Error('stepUntilArrived: units did not arrive')
}

describe('group MOVE formation destinations', () => {
  it('assigns distinct formation destinations around the target instead of stacking', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.formationSpread,
      identity: TEST_IDENTITY,
      initialWorld: worldWithUnits(4)
    })
    const units = sim.inspectState().world.aliveIds()
    const target = 10_000

    sim.step([buildMoveCommand(units, target, target)])

    const after = sim.inspectState()
    const destinations = units.map((id) => after.world.store(Movement).get(id))
    for (const destination of destinations) {
      expect(destination).toBeDefined()
    }
    const keys = new Set(destinations.map((d) => `${d!.destX},${d!.destY}`))
    expect(keys.size).toBe(units.length)
  })

  it('places the first unit exactly on the click and the rest nearby after arrival', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.formationFirstOnClick,
      identity: TEST_IDENTITY,
      initialWorld: worldWithUnits(4)
    })
    const units = sim.inspectState().world.aliveIds()
    const target = 5_000
    const sorted = [...units].sort((a, b) => a - b)

    sim.step([buildMoveCommand(units, target, target)])
    stepUntilArrived(sim, units)

    const after = sim.inspectState()
    expect(after.world.store(Position).get(sorted[0]!)).toEqual({ x: target, y: target })
    const keys = new Set(
      sorted.map((id) => {
        const pos = after.world.store(Position).get(id)!
        return `${pos.x},${pos.y}`
      })
    )
    expect(keys.size).toBe(units.length)
  })

  it('moves a single unit exactly to the target', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.formationSingle,
      identity: TEST_IDENTITY,
      initialWorld: worldWithUnits(1)
    })
    const unit = sim.inspectState().world.aliveIds()[0]!

    sim.step([buildMoveCommand([unit], 123, 456)])
    stepUntilArrived(sim, [unit])

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

    a.step([buildMoveCommand(units, 20_000, 30_000)])
    b.step([buildMoveCommand(units, 20_000, 30_000)])

    expect(b.hashState()).toBe(a.hashState())
  })
})
