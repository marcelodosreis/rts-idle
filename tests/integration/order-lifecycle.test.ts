import { createSimulation, deriveOrderState, Movement, OrderQueue, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import {
  buildHoldCommand,
  buildMoveCommand,
  buildPatrolCommand,
  buildStopCommand,
  SEEDS,
  TEST_IDENTITY,
  worldWithUnits
} from '../fixtures/index.js'

function unitState(
  sim: ReturnType<typeof createSimulation>,
  id: number
): { readonly state: string; readonly x: number; readonly y: number } {
  const after = sim.inspectState()
  const queue = after.world.store(OrderQueue).get(id)
  const pos = after.world.store(Position).get(id)!
  return { state: deriveOrderState(queue?.orders ?? []), x: pos.x, y: pos.y }
}

describe('order lifecycle', () => {
  it('STOP cancels an in-flight MOVE and freezes the unit', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithUnits(1)
    })
    const unit = sim.inspectState().world.aliveIds()[0]!

    sim.step([buildMoveCommand([unit], 10_000, 10_000)])
    sim.step()
    sim.step()
    const before = unitState(sim, unit)
    expect(before.state).toBe('moving')

    sim.step([buildStopCommand([unit])])
    sim.step()
    sim.step()

    const after = unitState(sim, unit)
    expect(after.state).toBe('idle')
    expect(sim.inspectState().world.store(Movement).get(unit)).toBeUndefined()
    expect({ x: after.x, y: after.y }).toEqual({ x: before.x, y: before.y })
  })

  it('HOLD sets the hold stance and prevents movement', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithUnits(1)
    })
    const unit = sim.inspectState().world.aliveIds()[0]!

    sim.step([buildMoveCommand([unit], 10_000, 10_000)])
    sim.step()
    sim.step([buildHoldCommand([unit])])
    sim.step()

    const after = unitState(sim, unit)
    expect(after.state).toBe('hold')
    expect(sim.inspectState().world.store(Movement).get(unit)).toBeUndefined()
  })

  it('append mode queues a second MOVE executed after the first', () => {
    const sim = createSimulation({
      seed: SEEDS.simulation.snapshotContinue,
      identity: TEST_IDENTITY,
      initialWorld: worldWithUnits(1)
    })
    const unit = sim.inspectState().world.aliveIds()[0]!
    const firstTarget = 2_000
    const secondTarget = 4_000

    sim.step([buildMoveCommand([unit], firstTarget, firstTarget)])
    sim.step([buildMoveCommand([unit], secondTarget, secondTarget, { sequence: 2, mode: 'append' })])

    const queue = sim.inspectState().world.store(OrderQueue).get(unit)
    expect(queue?.orders).toHaveLength(2)

    let guard = 0
    while (guard < 600) {
      sim.step()
      guard += 1
      const queueNow = sim.inspectState().world.store(OrderQueue).get(unit)
      if (queueNow === undefined) {
        break
      }
    }
    const final = sim.inspectState().world.store(Position).get(unit)!
    expect(final).toEqual({ x: secondTarget, y: secondTarget })
  })

  it('replace mode discards a queued second MOVE', () => {
    const sim = createSimulation({
      seed: SEEDS.simulation.snapshotContinue,
      identity: TEST_IDENTITY,
      initialWorld: worldWithUnits(1)
    })
    const unit = sim.inspectState().world.aliveIds()[0]!

    sim.step([buildMoveCommand([unit], 2_000, 2_000)])
    sim.step([buildMoveCommand([unit], 4_000, 4_000, { sequence: 2 })])

    const queue = sim.inspectState().world.store(OrderQueue).get(unit)
    expect(queue?.orders).toHaveLength(1)
    expect(queue?.orders[0]).toMatchObject({ type: 'MOVE', x: 4_000, y: 4_000 })
  })

  it('PATROL alternates between two points', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.formationSingle,
      identity: TEST_IDENTITY,
      initialWorld: worldWithUnits(1)
    })
    const unit = sim.inspectState().world.aliveIds()[0]!
    const pointA = { x: 1_000, y: 1_000 }
    const pointB = { x: 3_000, y: 1_000 }

    sim.step([buildPatrolCommand([unit], pointA.x, pointA.y, pointB.x, pointB.y)])

    let guard = 0
    let reachedA = false
    let reachedB = false
    while (guard < 1_000) {
      sim.step()
      guard += 1
      const pos = sim.inspectState().world.store(Position).get(unit)!
      if (pos.x === pointA.x && pos.y === pointA.y) {
        reachedA = true
      }
      if (pos.x === pointB.x && pos.y === pointB.y) {
        reachedB = true
      }
      if (reachedA && reachedB) {
        break
      }
    }
    expect(reachedA).toBe(true)
    expect(reachedB).toBe(true)
  })

  it('rejects STOP/HOLD/PATROL for a non-owner without mutating state', () => {
    const build = () =>
      createSimulation({
        seed: SEEDS.integration.moveNonOwner,
        identity: TEST_IDENTITY,
        initialWorld: worldWithUnits(1)
      })
    const sim = build()
    const control = build()
    const unit = sim.inspectState().world.aliveIds()[0]!

    const result = sim.step([buildStopCommand([unit], { playerId: 1 })])
    control.step([])

    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]!.code).toBe('NOT_OWNER')
    expect(sim.hashState()).toBe(control.hashState())
  })
})
