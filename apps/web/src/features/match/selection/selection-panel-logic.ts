import { constructionRefund } from '@rts/shared'
import type { HudConstruction, HudMineral } from '../ui/types'

export function constructionStatusLine(construction: HudConstruction): string {
  if (construction.status === 'COMPLETED') {
    return 'Ready'
  }
  const status = construction.builderId === null ? 'No worker assigned' : `Worker #${construction.builderId}`
  return `${construction.progressTicks}/${construction.totalTicks} · ${status}`
}

/** A construction can be cancelled only while owned by the player and incomplete. */
export function canCancelConstruction(construction: HudConstruction, humanPlayer: number): boolean {
  return construction.status !== 'COMPLETED' && construction.owner === humanPlayer
}

/** Display-only estimate; the authoritative refund is credited by the simulation. */
export function cancelRefundEstimate(construction: HudConstruction, costMinerals: number): number {
  return constructionRefund(costMinerals, construction.progressTicks, construction.totalTicks)
}

export function mineralRemainingLine(mineral: HudMineral): string {
  return `${mineral.remaining} remaining`
}
