import { FIXED_SCALE, intSqrt } from '@rts/shared'

/** Simulation tick rate, ticks per second (ADR-009). */
export const TICKS_PER_SECOND = 20

/**
 * Sub-unit scale for the movement remainder: 1 fixed unit = SUB sub-units.
 * The integer remainder accumulator prevents losing displacement to rounding
 * (master plan §8.1) while keeping positions integer fixed.
 */
export const MOVEMENT_SUB = 10_000

function floorDiv(numerator: number, divisor: number): number {
  return Math.floor(numerator / divisor)
}

function mod(numerator: number, divisor: number): number {
  return numerator - Math.floor(numerator / divisor) * divisor
}

/**
 * Deterministic integer rounding of `numerator / divisor` (half up for
 * positives, deterministic for negatives): `floor((2n + d) / 2d)`. Used to
 * round the per-axis displacement without platform-dependent floats.
 */
function roundDiv(numerator: number, divisor: number): number {
  return Math.floor((2 * numerator + divisor) / (2 * divisor))
}

export interface MovementStepInput {
  readonly x: number
  readonly y: number
  readonly destX: number
  readonly destY: number
  /** Movement speed in tiles per second (integer). */
  readonly speedTilesPerSecond: number
  /** Accumulated fractional x in sub-units (0..MOVEMENT_SUB-1). */
  readonly remainderX: number
  /** Accumulated fractional y in sub-units (0..MOVEMENT_SUB-1). */
  readonly remainderY: number
}

export interface MovementStepResult {
  readonly x: number
  readonly y: number
  readonly arrived: boolean
  readonly remainderX: number
  readonly remainderY: number
}

/**
 * Advances a unit one tick toward its destination in a straight line at
 * `speedTilesPerSecond`. All arithmetic is integer: the per-tick displacement
 * is computed in sub-units and split into an integer fixed-unit carry plus a
 * remainder that accumulates across ticks. Arrives exactly at the destination
 * (no overshoot) when the remaining distance fits in one step.
 */
export function movementStep(input: MovementStepInput): MovementStepResult {
  const { x, y, destX, destY, speedTilesPerSecond, remainderX, remainderY } = input
  const dx = destX - x
  const dy = destY - y
  const distanceSquared = dx * dx + dy * dy

  if (distanceSquared === 0) {
    return { x, y, arrived: true, remainderX: 0, remainderY: 0 }
  }

  const distance = intSqrt(distanceSquared)
  const stepSub = (speedTilesPerSecond * FIXED_SCALE * MOVEMENT_SUB) / TICKS_PER_SECOND
  const stepFixed = Math.floor(stepSub / MOVEMENT_SUB)

  if (distance <= stepFixed) {
    return { x: destX, y: destY, arrived: true, remainderX: 0, remainderY: 0 }
  }

  const displacementX = roundDiv(stepSub * dx, distance)
  const displacementY = roundDiv(stepSub * dy, distance)

  const accumulatedX = remainderX + displacementX
  const carryX = floorDiv(accumulatedX, MOVEMENT_SUB)
  const nextRemainderX = mod(accumulatedX, MOVEMENT_SUB)

  const accumulatedY = remainderY + displacementY
  const carryY = floorDiv(accumulatedY, MOVEMENT_SUB)
  const nextRemainderY = mod(accumulatedY, MOVEMENT_SUB)

  return {
    x: x + carryX,
    y: y + carryY,
    arrived: false,
    remainderX: nextRemainderX,
    remainderY: nextRemainderY
  }
}
