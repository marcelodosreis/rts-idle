import type {
  BuildCatalogEntry,
  ProductionCatalogEntry,
  ResearchCatalogEntry,
  SnapshotProductionItem
} from '@rts/protocol'
import { MAX_PRODUCTION_QUEUE } from '@rts/shared'
import type { HudConstruction, HudResources, HudSelectionUnit } from './types'

export function unitSelectionBlockReason(selection: readonly HudSelectionUnit[]): string | undefined {
  if (selection.length === 0) {
    return 'Select a unit first.'
  }
  if (selection.some((unit) => unit.owner !== 0)) {
    return 'Enemy units cannot receive your commands.'
  }
  return undefined
}

export function buildBlockReason(entry: BuildCatalogEntry, resources: HudResources | null): string | undefined {
  if (resources === null) {
    return 'Match resources are still loading.'
  }
  if (entry.type === 'MONASTERY' && resources.castleTier < 2) {
    return 'Requires Castle II.'
  }
  if (resources.mineral < entry.costMinerals) {
    return `Requires ${entry.costMinerals} minerals. You have ${resources.mineral}.`
  }
  return undefined
}

export function trainingBlockReason(
  entry: ProductionCatalogEntry,
  resources: HudResources | null,
  queueLength: number
): string | undefined {
  if (resources === null) {
    return 'Match resources are still loading.'
  }
  if (queueLength >= MAX_PRODUCTION_QUEUE) {
    return 'The production queue is full.'
  }
  if ((entry.unitKind === 'lancer' || entry.unitKind === 'monk') && resources.castleTier < 2) {
    return 'Requires Castle II.'
  }
  if (resources.mineral < entry.costMinerals) {
    return `Requires ${entry.costMinerals} minerals. You have ${resources.mineral}.`
  }
  const availableSupply = resources.supplyCap - resources.supply - resources.reservedSupply
  if (availableSupply < entry.supply) {
    return `Insufficient supply. Requires ${entry.supply}; ${Math.max(0, availableSupply)} available.`
  }
  return undefined
}

export function researchBlockReason(
  entry: ResearchCatalogEntry,
  resources: HudResources | null,
  queueLength: number
): string | undefined {
  if (resources === null) {
    return 'Match resources are still loading.'
  }
  if (resources.completedResearch.includes(entry.researchType)) {
    return 'Already completed.'
  }
  if (resources.queuedResearch.includes(entry.researchType)) {
    return 'Already queued in another Monastery.'
  }
  if (resources.castleTier < 2) {
    return 'Requires Castle II.'
  }
  if (queueLength >= MAX_PRODUCTION_QUEUE) {
    return 'The Monastery queue is full.'
  }
  if (resources.mineral < entry.costMinerals) {
    return `Requires ${entry.costMinerals} minerals. You have ${resources.mineral}.`
  }
  return undefined
}

export function upgradeBlockReason(
  construction: HudConstruction,
  cost: number,
  resources: HudResources | null
): string | undefined {
  if ((construction.production?.queue.length ?? 0) > 0) {
    return 'Finish the production queue before upgrading.'
  }
  if (resources === null) {
    return 'Match resources are still loading.'
  }
  if (resources.mineral < cost) {
    return `Requires ${cost} minerals. You have ${resources.mineral}.`
  }
  return undefined
}

export function isResearchItem(
  item: SnapshotProductionItem
): item is Extract<SnapshotProductionItem, { researchType: unknown }> {
  return 'researchType' in item
}
