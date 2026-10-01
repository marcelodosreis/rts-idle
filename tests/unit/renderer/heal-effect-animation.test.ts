import { AnimatedSprite, Texture, Ticker } from 'pixi.js'
import { describe, expect, it } from 'vitest'
import { type UnitFrames, UnitSprite } from '../../../packages/renderer/src/units/sprite.js'

function animation(frameCount: number): AnimatedSprite {
  const textures = Array.from({ length: frameCount }, () => Texture.WHITE)
  const sprite = new AnimatedSprite(textures, false)
  sprite.animationSpeed = 1
  return sprite
}

function frames(): UnitFrames {
  return {
    idle: animation(1),
    run: animation(1),
    attack: null,
    attackVariants: null,
    healEffect: animation(2),
    build: null,
    repairRun: null,
    repairInteract: null,
    gather: null,
    carryIdle: null,
    carryRun: null,
    gatherAxe: null,
    carryWoodIdle: null,
    carryWoodRun: null,
    travelAxeIdle: null,
    travelAxeRun: null,
    travelPickaxeIdle: null,
    travelPickaxeRun: null
  }
}

describe('Monk heal effect animation', () => {
  it('advances the target heal effect instead of leaving it on frame zero', () => {
    const unit = new UnitSprite('warrior', 0, frames())
    unit.beginHealEffect()
    const ticker = new Ticker()
    ticker.update(16.6667)
    unit.advanceAnimation(ticker)

    const animatedChildren = unit.container.children.filter((child) => child instanceof AnimatedSprite)
    expect(animatedChildren.some((child) => child.currentFrame > 0)).toBe(true)
    unit.destroy()
  })
})
