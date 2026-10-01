import { AnimatedSprite, type Container, Texture } from 'pixi.js'
import type { EconomyFrames } from './economy-animation.js'
import { LANCER_ATTACK_DIRECTIONS, type LancerAttackDirection } from './lancer-animation.js'

export interface UnitFrames extends EconomyFrames {
  readonly idle: AnimatedSprite
  readonly run: AnimatedSprite
  readonly attack: AnimatedSprite | null
  readonly attackVariants: Readonly<Record<LancerAttackDirection, AnimatedSprite | null>> | null
  readonly healEffect: AnimatedSprite | null
}

function cloneAnimation(template: AnimatedSprite, loop = true): AnimatedSprite {
  const textures = template.textures.filter((texture): texture is Texture => texture instanceof Texture)
  const clone = new AnimatedSprite(textures, false)
  clone.anchor.set(0.5, 0.5)
  clone.animationSpeed = template.animationSpeed
  clone.loop = loop
  clone.play()
  return clone
}

export function cloneUnitFrames(template: UnitFrames): UnitFrames {
  return {
    idle: cloneAnimation(template.idle),
    run: cloneAnimation(template.run),
    attack: template.attack === null ? null : cloneAnimation(template.attack),
    attackVariants:
      template.attackVariants === null
        ? null
        : (Object.fromEntries(
            LANCER_ATTACK_DIRECTIONS.map((direction) => [
              direction,
              template.attackVariants?.[direction] === null || template.attackVariants?.[direction] === undefined
                ? null
                : cloneAnimation(template.attackVariants[direction]!)
            ])
          ) as Record<LancerAttackDirection, AnimatedSprite | null>),
    healEffect: template.healEffect === null ? null : cloneAnimation(template.healEffect, false),
    build: template.build === null ? null : cloneAnimation(template.build),
    gather: template.gather === null ? null : cloneAnimation(template.gather),
    carryIdle: template.carryIdle === null ? null : cloneAnimation(template.carryIdle),
    carryRun: template.carryRun === null ? null : cloneAnimation(template.carryRun),
    repairRun: template.repairRun === null ? null : cloneAnimation(template.repairRun),
    repairInteract: template.repairInteract === null ? null : cloneAnimation(template.repairInteract),
    gatherAxe: template.gatherAxe === null ? null : cloneAnimation(template.gatherAxe),
    carryWoodIdle: template.carryWoodIdle === null ? null : cloneAnimation(template.carryWoodIdle),
    carryWoodRun: template.carryWoodRun === null ? null : cloneAnimation(template.carryWoodRun),
    travelAxeIdle: template.travelAxeIdle === null ? null : cloneAnimation(template.travelAxeIdle),
    travelAxeRun: template.travelAxeRun === null ? null : cloneAnimation(template.travelAxeRun),
    travelPickaxeIdle: template.travelPickaxeIdle === null ? null : cloneAnimation(template.travelPickaxeIdle),
    travelPickaxeRun: template.travelPickaxeRun === null ? null : cloneAnimation(template.travelPickaxeRun)
  }
}

export function installFrames(container: Container, frames: UnitFrames): void {
  const allFrames = [
    frames.idle,
    frames.run,
    frames.attack,
    ...(frames.attackVariants === null ? [] : Object.values(frames.attackVariants)),
    frames.build,
    frames.gather,
    frames.gatherAxe,
    frames.repairRun,
    frames.repairInteract,
    frames.carryIdle,
    frames.carryRun,
    frames.carryWoodIdle,
    frames.carryWoodRun,
    frames.travelAxeIdle,
    frames.travelAxeRun,
    frames.travelPickaxeIdle,
    frames.travelPickaxeRun,
    frames.healEffect
  ]
  for (const frame of allFrames) {
    if (frame !== null) {
      frame.visible = false
      container.addChild(frame)
    }
  }
}
