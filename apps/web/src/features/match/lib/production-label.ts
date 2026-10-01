import type { SnapshotProductionItem, SnapshotResearchProductionItem } from '@rts/protocol'
import { TRAINABLE_LABEL } from '../types/hud-types'

export function isResearchItem(item: SnapshotProductionItem): item is SnapshotResearchProductionItem {
  return 'researchType' in item
}

export function productionItemLabel(item: SnapshotProductionItem): string {
  if (!isResearchItem(item)) {
    return TRAINABLE_LABEL[item.unitKind]
  }
  if (item.researchType === 'ATTACK') {
    return 'Attack Research'
  }
  if (item.researchType === 'DEFENSE') {
    return 'Defense Research'
  }
  if (item.researchType === 'ECONOMY') {
    return 'Economy Research'
  }
  return 'Movement Research'
}
