import { unitAssetKey } from './economy-animation.js'

export const LANCER_ATTACK_DIRECTIONS = ['up', 'upright', 'right', 'downright', 'down'] as const
export type LancerAttackDirection = (typeof LANCER_ATTACK_DIRECTIONS)[number]

export function lancerDirectionForDelta(dx: number, dy: number): LancerAttackDirection {
  const horizontal = Math.abs(dx)
  const vertical = Math.abs(dy)
  if (vertical > horizontal * 2) {
    return dy < 0 ? 'up' : 'down'
  }
  if (horizontal > vertical * 2) {
    return 'right'
  }
  return dy < 0 ? 'upright' : 'downright'
}

export function lancerAttackFrameKey(owner: number, direction: LancerAttackDirection): string {
  return unitAssetKey(owner, 'lancer', `${direction}_attack`)
}
