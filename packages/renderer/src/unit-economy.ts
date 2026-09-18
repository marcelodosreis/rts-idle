import type { EconomyPhase } from '@rts/protocol'
import type { AnimatedSprite, Graphics } from 'pixi.js'
import type { RenderUnit } from './types.js'

export const FACTION_BY_OWNER: readonly ('blue' | 'red' | 'purple' | 'yellow')[] = ['blue', 'red', 'purple', 'yellow']

export interface EconomyFrames {
  readonly gather: AnimatedSprite | null
  readonly carryIdle: AnimatedSprite | null
  readonly carryRun: AnimatedSprite | null
}

export function economyFrameKey(owner: number, anim: keyof EconomyFrames): string {
  const faction = FACTION_BY_OWNER[owner % FACTION_BY_OWNER.length] ?? 'blue'
  let subtype = 'run_gold'
  if (anim === 'gather') {
    subtype = 'interact_pickaxe'
  }
  if (anim === 'carryIdle') {
    subtype = 'idle_gold'
  }
  return `units.${faction}.pawn.pawn_${subtype}`
}

export function economyAnimation(
  frames: EconomyFrames,
  phase: EconomyPhase | undefined,
  moving: boolean
): AnimatedSprite | null {
  if (phase === 'gathering') {
    return frames.gather
  }
  if (phase === 'to_base') {
    return moving ? frames.carryRun : frames.carryIdle
  }
  return null
}

export function drawEconomyBar(graphics: Graphics, economy: RenderUnit['economy']): void {
  if (economy === undefined) {
    graphics.visible = false
    return
  }
  let ratio = economy.cargoCapacity <= 0 ? 0 : economy.cargoAmount / economy.cargoCapacity
  if (economy.phase === 'gathering') {
    ratio = economy.progressMax <= 0 ? 0 : economy.progressTicks / economy.progressMax
  }
  const width = 44
  const fill = Math.max(0, Math.min(width, width * ratio))
  graphics.visible = true
  graphics.clear()
  graphics.rect(-width / 2, -48, width, 5).fill({ color: 0x111827, alpha: 0.8 })
  graphics.rect(-width / 2, -48, fill, 5).fill({ color: economy.phase === 'gathering' ? 0xfbbf24 : 0x22c55e })
}
