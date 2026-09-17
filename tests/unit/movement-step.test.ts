import { movementStep } from '@rts/simulation/systems/movement-step.js'
import { describe, expect, it } from 'vitest'

describe('movementStep', () => {
  it('moves in a straight line with integer positions and a remainder', () => {
    const first = movementStep({
      x: 0,
      y: 0,
      destX: 256,
      destY: 256,
      speedTilesPerSecond: 3,
      remainderX: 0,
      remainderY: 0
    })
    expect(first.arrived).toBe(false)
    expect(first.x).toBe(first.y) // straight diagonal: axis steps are equal
    expect(Number.isInteger(first.x)).toBe(true)
    expect(Number.isInteger(first.y)).toBe(true)
    expect(first.remainderX).toBeGreaterThan(0)
    expect(first.remainderX).toBeLessThan(10_000)
  })

  it('accumulates the remainder so speed is not lost to rounding', () => {
    let state = movementStep({
      x: 0,
      y: 0,
      destX: 256,
      destY: 256,
      speedTilesPerSecond: 3,
      remainderX: 0,
      remainderY: 0
    })
    const ticks = 6
    for (let i = 1; i < ticks; i += 1) {
      state = movementStep({
        x: state.x,
        y: state.y,
        destX: 256,
        destY: 256,
        speedTilesPerSecond: 3,
        remainderX: state.remainderX,
        remainderY: state.remainderY
      })
    }
    // 6 ticks at 3 tiles/s on the diagonal of one tile: roughly 6 * 0.15/sqrt(2) tiles per axis.
    expect(state.x).toBeGreaterThan(100)
    expect(state.arrived).toBe(false)
  })

  it('arrives exactly at the destination without overshoot', () => {
    const state = movementStep({
      x: 250,
      y: 250,
      destX: 256,
      destY: 256,
      speedTilesPerSecond: 3,
      remainderX: 0,
      remainderY: 0
    })
    expect(state).toEqual({ x: 256, y: 256, arrived: true, remainderX: 0, remainderY: 0 })
  })

  it('is idempotent at the destination', () => {
    const state = movementStep({
      x: 256,
      y: 256,
      destX: 256,
      destY: 256,
      speedTilesPerSecond: 3,
      remainderX: 0,
      remainderY: 0
    })
    expect(state.arrived).toBe(true)
    expect(state.x).toBe(256)
  })

  it('is deterministic for the same inputs', () => {
    const input = { x: 0, y: 0, destX: 512, destY: 128, speedTilesPerSecond: 4, remainderX: 0, remainderY: 0 }
    expect(movementStep(input)).toEqual(movementStep(input))
  })
})
