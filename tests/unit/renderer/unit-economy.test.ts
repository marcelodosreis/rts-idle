import type { AnimatedSprite } from 'pixi.js'
import { describe, expect, it } from 'vitest'
import { progressFillColor } from '../../../packages/renderer/src/effects/progress-palette.js'
import { drawEconomyBar } from '../../../packages/renderer/src/units/economy.js'
import {
  type EconomyFrames,
  economyAnimation,
  economyFrameKey
} from '../../../packages/renderer/src/units/economy-animation.js'
import { economyBarColor, economyBarRatio } from '../../../packages/renderer/src/units/economy-helpers.js'
import { facingForState } from '../../../packages/renderer/src/units/facing.js'

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
    build: fakeSprite(),
    repairRun: fakeSprite(),
    repairInteract: fakeSprite(),
    gather: fakeSprite(),
    carryIdle: fakeSprite(),
    carryRun: fakeSprite()
  }

  it('shows the gather sprite while gathering, moving or not', () => {
    expect(economyAnimation(frames, { phase: 'gathering', moving: false })).toBe(frames.gather)
    expect(economyAnimation(frames, { phase: 'gathering', moving: true })).toBe(frames.gather)
  })

  it('shows the hammer sprite while building', () => {
    expect(economyAnimation(frames, { phase: undefined, moving: false, building: true })).toBe(frames.build)
    expect(economyAnimation(frames, { phase: undefined, moving: true, building: true })).toBe(frames.build)
  })

  it('shows run_hammer while moving to a repair target', () => {
    expect(economyAnimation(frames, { phase: undefined, moving: true, repairing: true })).toBe(frames.repairRun)
  })

  it('shows interact_hammer while repairing at the target', () => {
    expect(economyAnimation(frames, { phase: undefined, moving: false, repairing: true })).toBe(frames.repairInteract)
  })

  it('shows carry_run while moving back to base', () => {
    expect(economyAnimation(frames, { phase: 'to_base', moving: true })).toBe(frames.carryRun)
  })

  it('shows carry_idle when stopped while returning to base', () => {
    expect(economyAnimation(frames, { phase: 'to_base', moving: false })).toBe(frames.carryIdle)
  })

  it('falls back to run/idle handling for to_node and waiting_for_base', () => {
    expect(economyAnimation(frames, { phase: 'to_node', moving: true })).toBeNull()
    expect(economyAnimation(frames, { phase: 'waiting_for_base', moving: false })).toBeNull()
  })

  it('falls back to run/idle handling when there is no economy phase', () => {
    expect(economyAnimation(frames, { phase: undefined, moving: true })).toBeNull()
  })

  it('shows carry_run while carrying cargo without an economy phase', () => {
    expect(economyAnimation(frames, { phase: undefined, moving: true, carrying: true })).toBe(frames.carryRun)
  })

  it('shows carry_idle while stopped and carrying cargo without an economy phase', () => {
    expect(economyAnimation(frames, { phase: undefined, moving: false, carrying: true })).toBe(frames.carryIdle)
  })
})

describe('facingForState', () => {
  it('keeps movement direction while travelling even when the work target is opposite', () => {
    expect(facingForState(1, 0, { moving: true, facingLeft: true, lookAtX: 10 })).toBe(-1)
  })

  it('faces the work target after movement stops', () => {
    expect(facingForState(-1, 10, { moving: false, facingLeft: true, lookAtX: 20 })).toBe(1)
  })
})

describe('economyFrameKey', () => {
  it('maps build to the hammer interaction sprite', () => {
    expect(economyFrameKey(0, 'build')).toBe('units.blue.pawn.pawn_interact_hammer')
  })

  it('maps repair movement to the hammer run sprite', () => {
    expect(economyFrameKey(0, 'repairRun')).toBe('units.blue.pawn.pawn_run_hammer')
  })

  it('maps repair work to the hammer interaction sprite', () => {
    expect(economyFrameKey(0, 'repairInteract')).toBe('units.blue.pawn.pawn_interact_hammer')
  })

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

describe('economyBarRatio', () => {
  it('returns 0 when economy is undefined', () => {
    expect(economyBarRatio(undefined)).toBe(0)
  })

  it('uses progressTicks/progressMax when gathering', () => {
    expect(
      economyBarRatio({
        phase: 'gathering',
        progressTicks: 5,
        progressMax: 10,
        cargoAmount: 0,
        cargoCapacity: 10,
        nodeId: 1
      })
    ).toBe(0.5)
  })

  it('uses cargoAmount/cargoCapacity when to_base', () => {
    expect(
      economyBarRatio({
        phase: 'to_base',
        progressTicks: 0,
        progressMax: 10,
        cargoAmount: 3,
        cargoCapacity: 10,
        nodeId: 1
      })
    ).toBe(0.3)
  })

  it('uses cargoAmount/cargoCapacity when to_node', () => {
    expect(
      economyBarRatio({
        phase: 'to_node',
        progressTicks: 0,
        progressMax: 10,
        cargoAmount: 7,
        cargoCapacity: 10,
        nodeId: 1
      })
    ).toBe(0.7)
  })

  it('clamps ratio to 0..1', () => {
    expect(
      economyBarRatio({
        phase: 'gathering',
        progressTicks: 15,
        progressMax: 10,
        cargoAmount: 0,
        cargoCapacity: 10,
        nodeId: 1
      })
    ).toBe(1)
  })
})

describe('economyBarColor', () => {
  it('returns purple when gathering', () => {
    expect(
      economyBarColor({
        phase: 'gathering',
        progressTicks: 5,
        progressMax: 10,
        cargoAmount: 0,
        cargoCapacity: 10,
        nodeId: 1
      })
    ).toBe(progressFillColor('mining'))
  })

  it('returns green when to_base', () => {
    expect(
      economyBarColor({
        phase: 'to_base',
        progressTicks: 0,
        progressMax: 10,
        cargoAmount: 3,
        cargoCapacity: 10,
        nodeId: 1
      })
    ).toBe(progressFillColor('delivery'))
  })

  it('returns purple when going to a mineral node', () => {
    expect(
      economyBarColor({
        phase: 'to_node',
        progressTicks: 0,
        progressMax: 10,
        cargoAmount: 3,
        cargoCapacity: 10,
        nodeId: 1
      })
    ).toBe(progressFillColor('mining'))
  })

  it('returns green when waiting_for_base', () => {
    expect(
      economyBarColor({
        phase: 'waiting_for_base',
        progressTicks: 0,
        progressMax: 10,
        cargoAmount: 3,
        cargoCapacity: 10,
        nodeId: 1
      })
    ).toBe(progressFillColor('delivery'))
  })
})

describe('drawEconomyBar', () => {
  it('draws a visible gathering bar using the worker progress ratio', () => {
    const calls: Array<{ readonly method: string; readonly values: readonly number[] }> = []
    const graphics = {
      visible: false,
      clear() {
        calls.push({ method: 'clear', values: [] })
        return this
      },
      roundRect(x: number, y: number, width: number, height: number, radius: number) {
        calls.push({ method: 'roundRect', values: [x, y, width, height, radius] })
        return this
      },
      fill() {
        calls.push({ method: 'fill', values: [] })
        return this
      },
      stroke() {
        calls.push({ method: 'stroke', values: [] })
        return this
      }
    }

    expect(() =>
      drawEconomyBar(graphics as never, {
        phase: 'gathering',
        progressTicks: 5,
        progressMax: 10,
        cargoAmount: 0,
        cargoCapacity: 10,
        nodeId: 1
      })
    ).not.toThrow()

    expect(graphics.visible).toBe(true)
    expect(calls.map((call) => call.method)).toEqual([
      'clear',
      'roundRect',
      'fill',
      'roundRect',
      'fill',
      'roundRect',
      'stroke'
    ])
    expect(calls.find((call) => call.method === 'roundRect' && call.values[2] === 22)?.values).toEqual([
      -22, -48, 22, 6, 2
    ])
  })
})
