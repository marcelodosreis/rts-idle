import { createSimulation, Movement, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { buildMoveCommand, SEEDS, TEST_IDENTITY, worldWithUnits } from '../fixtures/index.js'

describe('real movement across ticks', () => {
  it('advances position gradually toward the target and arrives exactly', () => {
    const sim = createSimulation({
      seed: SEEDS.simulation.fixedTick,
      identity: TEST_IDENTITY,
      initialWorld: worldWithUnits(1)
    })
    const unit = sim.inspectState().world.aliveIds()[0]!
    const target = 10_000

    sim.step([buildMoveCommand([unit], target, target)])

    let previousX = 0
    let previousY = 0
    let arrived = false
    for (let tick = 0; tick < 600; tick += 1) {
      sim.step()
      const after = sim.inspectState()
      const position = after.world.store(Position).get(unit)!
      if (position.x !== previousX || position.y !== previousY) {
        expect(position.x).toBeGreaterThan(previousX)
        expect(position.y).toBeGreaterThan(previousY)
        previousX = position.x
        previousY = position.y
      }
      if (after.world.store(Movement).get(unit) === undefined) {
        expect(position).toEqual({ x: target, y: target })
        arrived = true
        break
      }
    }
    expect(arrived).toBe(true)
  })

  it('a new MOVE redirects an in-flight unit toward the new target', () => {
    const sim = createSimulation({
      seed: SEEDS.simulation.snapshotContinue,
      identity: TEST_IDENTITY,
      initialWorld: worldWithUnits(1)
    })
    const unit = sim.inspectState().world.aliveIds()[0]!
    const firstTarget = 20_000
    const secondTarget = 5_000

    sim.step([buildMoveCommand([unit], firstTarget, firstTarget)])
    sim.step()
    sim.step()
    sim.step([buildMoveCommand([unit], secondTarget, secondTarget)])

    const movement = sim.inspectState().world.store(Movement).get(unit)
    expect(movement).toBeDefined()
    expect(movement!.destX).toBe(secondTarget)
    expect(movement!.destY).toBe(secondTarget)
  })
})
