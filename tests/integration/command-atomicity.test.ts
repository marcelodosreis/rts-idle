import { createSimulation, type GameState, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { buildMoveCommand, SEEDS, TEST_IDENTITY, worldWithOwners } from '../fixtures/index.js'

function nextEntityIds(state: GameState): { readonly nextEntityId: number; readonly rng: string } {
  return { nextEntityId: state.nextEntityId, rng: `${state.rng.s0},${state.rng.s1},${state.rng.s2},${state.rng.s3}` }
}

describe('command atomicity', () => {
  it('a rejected command preserves hash, RNG, and id allocation', () => {
    const build = () =>
      createSimulation({
        seed: SEEDS.integration.moveNonOwner,
        identity: TEST_IDENTITY,
        initialWorld: worldWithOwners([0])
      })
    const withRejected = build()
    const control = build()
    const unit = withRejected.inspectState().world.aliveIds()[0]!

    const result = withRejected.step([buildMoveCommand([unit], 100, 100, { playerId: 1 })])
    control.step([])

    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]!.code).toBe('NOT_OWNER')
    expect(withRejected.hashState()).toBe(control.hashState())
    expect(nextEntityIds(withRejected.inspectState())).toEqual(nextEntityIds(control.inspectState()))
    expect(withRejected.inspectState().world.store(Position).get(unit)).toEqual({ x: 0, y: 0 })
  })

  it('a rejected command does not block other valid commands in the same tick', () => {
    const build = () =>
      createSimulation({
        seed: SEEDS.integration.moveOwn,
        identity: TEST_IDENTITY,
        initialWorld: worldWithOwners([0, 0])
      })
    const sim = build()
    const [a, b] = sim.inspectState().world.aliveIds()

    const result = sim.step([buildMoveCommand([a], 1, 1, { playerId: 1 }), buildMoveCommand([b], 50, 50)])

    expect(result.rejected).toHaveLength(1)
    const after = sim.inspectState()
    expect(after.world.store(Position).get(a)).toEqual({ x: 0, y: 0 })
    expect(after.world.store(Position).get(b)).not.toEqual({ x: 0, y: 0 })
  })

  it('a malformed payload is rejected without mutating state', () => {
    const build = () =>
      createSimulation({
        seed: SEEDS.integration.moveFractional,
        identity: TEST_IDENTITY,
        initialWorld: worldWithOwners([0])
      })
    const sim = build()
    const control = build()
    const unit = sim.inspectState().world.aliveIds()[0]!

    const result = sim.step([buildMoveCommand([unit], 100.5, 0)])
    control.step([])

    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]!.code).toBe('INVALID_PAYLOAD')
    expect(sim.hashState()).toBe(control.hashState())
  })
})
