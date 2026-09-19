import { type EconomyFrames, economyAnimation, economyFrameKey } from '@rts/renderer'
import type { AnimatedSprite } from 'pixi.js'
import { describe, expect, it } from 'vitest'

// Regression coverage for the sprite-selection logic itself: E2E only
// exercises the game's phase transitions (see economy-playable.spec.ts),
// since CI never has the tiny_swords art loaded and every sprite renders
// as 'fallback' there. This is the only place that would catch a broken
// phase-to-animation mapping.

function fakeSprite(): AnimatedSprite {
  return {} as AnimatedSprite
}

describe('economyAnimation', () => {
  const frames: EconomyFrames = {
    gather: fakeSprite(),
    carryIdle: fakeSprite(),
    carryRun: fakeSprite()
  }

  it('shows the gather sprite while gathering, moving or not', () => {
    expect(economyAnimation(frames, 'gathering', false)).toBe(frames.gather)
    expect(economyAnimation(frames, 'gathering', true)).toBe(frames.gather)
  })

  it('shows carry_run while moving back to base', () => {
    expect(economyAnimation(frames, 'to_base', true)).toBe(frames.carryRun)
  })

  it('shows carry_idle when stopped while returning to base', () => {
    expect(economyAnimation(frames, 'to_base', false)).toBe(frames.carryIdle)
  })

  it('falls back to run/idle handling for to_node and waiting_for_base', () => {
    expect(economyAnimation(frames, 'to_node', true)).toBeNull()
    expect(economyAnimation(frames, 'waiting_for_base', false)).toBeNull()
  })

  it('falls back to run/idle handling when there is no economy phase', () => {
    expect(economyAnimation(frames, undefined, true)).toBeNull()
  })
})

describe('economyFrameKey', () => {
  it('maps gather to the pickaxe interaction sprite', () => {
    expect(economyFrameKey(0, 'gather')).toBe('units.blue.pawn.pawn_interact_pickaxe')
  })

  it('maps carryIdle to the idle gold sprite', () => {
    expect(economyFrameKey(0, 'carryIdle')).toBe('units.blue.pawn.pawn_idle_gold')
  })

  it('maps carryRun to the run gold sprite', () => {
    expect(economyFrameKey(0, 'carryRun')).toBe('units.blue.pawn.pawn_run_gold')
  })

  it('keys by owner faction', () => {
    expect(economyFrameKey(1, 'gather')).toBe('units.red.pawn.pawn_interact_pickaxe')
    expect(economyFrameKey(2, 'gather')).toBe('units.purple.pawn.pawn_interact_pickaxe')
    expect(economyFrameKey(3, 'gather')).toBe('units.yellow.pawn.pawn_interact_pickaxe')
  })
})
