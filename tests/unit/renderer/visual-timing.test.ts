import { describe, expect, it } from 'vitest'
import {
  frameCountToPixiAnimationSpeed,
  STANDARD_ATTACK_CYCLE_MS
} from '../../../packages/renderer/src/core/visual-timing.js'

describe('visual timing', () => {
  it('normalizes different attack frame counts to one cycle', () => {
    const lancerSpeed = frameCountToPixiAnimationSpeed(3, STANDARD_ATTACK_CYCLE_MS)
    const warriorSpeed = frameCountToPixiAnimationSpeed(4, STANDARD_ATTACK_CYCLE_MS)
    const archerSpeed = frameCountToPixiAnimationSpeed(8, STANDARD_ATTACK_CYCLE_MS)

    expect(3 / (lancerSpeed * 60)).toBeCloseTo(STANDARD_ATTACK_CYCLE_MS / 1000)
    expect(4 / (warriorSpeed * 60)).toBeCloseTo(STANDARD_ATTACK_CYCLE_MS / 1000)
    expect(8 / (archerSpeed * 60)).toBeCloseTo(STANDARD_ATTACK_CYCLE_MS / 1000)
  })
})
