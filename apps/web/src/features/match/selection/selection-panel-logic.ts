import type { SnapshotProductionItem } from '@rts/protocol'
import { constructionRefund, productionRefund } from '@rts/shared'
import type { HudConstruction, HudResource } from '../ui/types'

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
export function cancelRefundEstimate(construction: HudConstruction, costGold: number): number {
  return constructionRefund({ GOLD: costGold }, construction.progressTicks, construction.totalTicks).GOLD ?? 0
}

/** Display-only production refund; the simulation remains authoritative. */
export function productionRefundEstimate(item: SnapshotProductionItem): number {
  return productionRefund(item.status, item.cost, item.progressTicks, item.totalTicks).GOLD ?? 0
}

export function resourceRemainingLine(resource: HudResource): string {
  return `${resource.remaining} remaining`
}
