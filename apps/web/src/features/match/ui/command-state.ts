import type {
  BuildCatalogEntry,
  ProductionCatalogEntry,
  ResearchCatalogEntry,
  SnapshotProductionItem
} from '@rts/protocol'
import { MAX_PRODUCTION_QUEUE } from '@rts/shared'
import type { HudFeedbackTarget } from './HudContextFeedback'
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
  if (resources.resources.GOLD < (entry.cost.GOLD ?? 0)) {
    return `Requires ${entry.cost.GOLD ?? 0} gold. You have ${resources.resources.GOLD}.`
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
  if (resources.resources.GOLD < (entry.cost.GOLD ?? 0)) {
    return `Requires ${entry.cost.GOLD ?? 0} gold. You have ${resources.resources.GOLD}.`
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
  if (resources.resources.GOLD < (entry.cost.GOLD ?? 0)) {
    return `Requires ${entry.cost.GOLD ?? 0} gold. You have ${resources.resources.GOLD}.`
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
  if (resources.resources.GOLD < cost) {
    return `Requires ${cost} gold. You have ${resources.resources.GOLD}.`
  }
  return undefined
}

export function blockedFeedbackTarget(reason: string | undefined): HudFeedbackTarget {
  if (reason === undefined) {
    return 'command'
  }
  if (reason.includes('minerals')) {
    return 'minerals'
  }
  if (reason.includes('supply')) {
    return 'supply'
  }
  if (reason.includes('queue')) {
    return 'queue'
  }
  return 'command'
}

/** Enemy constructions are selectable for inspection, never commandable. */
export function canCommandConstruction(construction: HudConstruction, humanPlayer: number): boolean {
  return construction.owner === humanPlayer
}

export function isResearchItem(
  item: SnapshotProductionItem
): item is Extract<SnapshotProductionItem, { researchType: unknown }> {
  return 'researchType' in item
}
