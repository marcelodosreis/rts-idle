import type {
  BuildCatalogEntry,
  ProductionCatalogEntry,
  ResearchCatalogEntry,
  SnapshotProductionItem
} from '@rts/protocol'
import { MAX_PRODUCTION_QUEUE, type ResourceCost } from '@rts/shared'
import type { HudFeedbackTarget } from '../components/hud-context-feedback'
import type { HudConstruction, HudResources, HudSelectionUnit } from '../types/hud-types'
import { firstResourceShortfall, resourceTypeLabel } from './resource-cost'

export function unitSelectionBlockReason(selection: readonly HudSelectionUnit[]): string | undefined {
  if (selection.length === 0) {
    return 'Select a unit first.'
  }
  if (selection.some((unit) => unit.owner !== 0)) {
    return 'Enemy units cannot receive your commands.'
  }
  return undefined
}

export function isWorkerSelection(selection: readonly HudSelectionUnit[]): boolean {
  const selectedUnit = selection[0]
  return (
    selection.length === 1 &&
    (selectedUnit?.canGather === true ||
      selectedUnit?.canBuild === true ||
      selectedUnit?.canRepair === true ||
      selectedUnit?.acceptsDeposit === true)
  )
}

export function buildBlockReason(entry: BuildCatalogEntry, resources: HudResources | null): string | undefined {
  if (resources === null) {
    return 'Match resources are still loading.'
  }
  if (entry.minimumCastleTier !== undefined && resources.castleTier < entry.minimumCastleTier) {
    return `Requires Castle ${entry.minimumCastleTier}.`
  }
  const shortfall = firstResourceShortfall(resources.resources, entry.cost)
  if (shortfall !== undefined) {
    return `Requires ${shortfall.amount} ${resourceTypeLabel(shortfall.type)}. You have ${shortfall.available}.`
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
  if (entry.minimumCastleTier !== undefined && resources.castleTier < entry.minimumCastleTier) {
    return `Requires Castle ${entry.minimumCastleTier}.`
  }
  const shortfall = firstResourceShortfall(resources.resources, entry.cost)
  if (shortfall !== undefined) {
    return `Requires ${shortfall.amount} ${resourceTypeLabel(shortfall.type)}. You have ${shortfall.available}.`
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
  if (entry.minimumCastleTier !== undefined && resources.castleTier < entry.minimumCastleTier) {
    return `Requires Castle ${entry.minimumCastleTier}.`
  }
  if (queueLength >= MAX_PRODUCTION_QUEUE) {
    return 'The Monastery queue is full.'
  }
  const shortfall = firstResourceShortfall(resources.resources, entry.cost)
  if (shortfall !== undefined) {
    return `Requires ${shortfall.amount} ${resourceTypeLabel(shortfall.type)}. You have ${shortfall.available}.`
  }
  return undefined
}

export function upgradeBlockReason(
  construction: HudConstruction,
  cost: ResourceCost,
  resources: HudResources | null
): string | undefined {
  if ((construction.production?.queue.length ?? 0) > 0) {
    return 'Finish the production queue before upgrading.'
  }
  if (resources === null) {
    return 'Match resources are still loading.'
  }
  const shortfall = firstResourceShortfall(resources.resources, cost)
  if (shortfall !== undefined) {
    return `Requires ${shortfall.amount} ${resourceTypeLabel(shortfall.type)}. You have ${shortfall.available}.`
  }
  return undefined
}

export function blockedFeedbackTarget(reason: string | undefined): HudFeedbackTarget {
  if (reason === undefined) {
    return 'command'
  }
  if (reason.includes('gold')) {
    return 'gold'
  }
  if (reason.includes('supply')) {
    return 'supply'
  }
  if (reason.includes('queue')) {
    return 'queue'
  }
  return 'command'
}

/** Enemy constructions are inspectable, but their available commands remain locked. */
export function constructionCommandBlockReason(construction: HudConstruction, humanPlayer: number): string | undefined {
  return construction.owner === humanPlayer ? undefined : 'Enemy constructions cannot receive your commands.'
}

/** A running Castle tier upgrade locks every command of that building. */
export function constructionUpgradeBlockReason(construction: HudConstruction): string | undefined {
  return construction.tierUpgrade == null ? undefined : 'Castle upgrade in progress.'
}

export function isResearchItem(
  item: SnapshotProductionItem
): item is Extract<SnapshotProductionItem, { researchType: unknown }> {
  return 'researchType' in item
}
