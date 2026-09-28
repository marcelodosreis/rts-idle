import { FIXED_SCALE, MOVEMENT_SPEED_SCALE } from '@rts/shared'
import { MOVEMENT_SUB, type MovementStepResult, movementStep, TICKS_PER_SECOND } from '@rts/simulation'
import { describe, expect, it } from 'vitest'

function advance(speedTilesPerSecondFixed: number): MovementStepResult {
  let state: MovementStepResult = {
    x: 0,
    y: 0,
    arrived: false,
    remainderX: 0,
    remainderY: 0
  }
  for (let tick = 0; tick < TICKS_PER_SECOND; tick += 1) {
    state = movementStep({
      x: state.x,
      y: state.y,
      destX: 100 * FIXED_SCALE,
      destY: 0,
      speedTilesPerSecondFixed,
      remainderX: state.remainderX,
      remainderY: state.remainderY
    })
  }
  return state
}

describe('fixed-point movement speed', () => {
  it('retains an exact 10 percent Movement bonus without rounding to whole tiles', () => {
    const boosted = advance(4 * MOVEMENT_SPEED_SCALE + (4 * MOVEMENT_SPEED_SCALE) / 10)

    expect(boosted.x).toBe(Math.floor(4.4 * FIXED_SCALE))
    expect(boosted.remainderX).toBe(4_000)
  })

  it('keeps the fractional carry bounded', () => {
    const boosted = advance(5 * MOVEMENT_SPEED_SCALE + (5 * MOVEMENT_SPEED_SCALE) / 10)

    expect(boosted.remainderX).toBeGreaterThanOrEqual(0)
    expect(boosted.remainderX).toBeLessThan(MOVEMENT_SUB)
  })
})
