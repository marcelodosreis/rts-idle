import type { SnapshotProductionItem } from '@rts/protocol'
import { constructionRefund, productionRefund } from '@rts/shared'
import type { HudConstruction, HudMineral } from '../types/hud-types'

export function constructionStatusLine(construction: HudConstruction): string {
  if (construction.tierUpgrade !== undefined && construction.tierUpgrade !== null) {
    return `${construction.tierUpgrade.progressTicks}/${construction.tierUpgrade.totalTicks}`
  }
  const status = construction.builderId === null ? 'No worker assigned' : `Worker #${construction.builderId}`
  if (construction.status === 'COMPLETED') {
    return 'Ready'
  }
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

/** Display-only production refund; the simulation remains authoritative. */
export function productionRefundEstimate(item: SnapshotProductionItem): number {
  return productionRefund(item.status, item.costMinerals, item.progressTicks, item.totalTicks)
}

export function mineralRemainingLine(mineral: HudMineral): string {
  return `${mineral.remaining} remaining`
}
