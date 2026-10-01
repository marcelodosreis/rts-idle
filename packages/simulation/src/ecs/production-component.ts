import {
  type ProductionItemStatus,
  RESOURCE_TYPES,
  type ResearchType,
  type ResourceCost,
  type TrainableUnitKind
} from '@rts/shared'
import type { CanonicalReader } from '../canonical/reader.js'
import type { CanonicalWriter } from '../canonical/writer.js'
import { kindFromTag, kindTag } from './codecs.js'
import type { ComponentType } from './components.js'

export interface UnitProductionItem {
  readonly unitKind: TrainableUnitKind
  readonly cost: ResourceCost
  readonly reservedSupply: number
  readonly progressTicks: number
  readonly totalTicks: number
  readonly status: ProductionItemStatus
  readonly researchType?: never
}

export interface ResearchProductionItem {
  readonly researchType: ResearchType
  readonly cost: ResourceCost
  readonly progressTicks: number
  readonly totalTicks: number
  readonly status: ProductionItemStatus
  readonly unitKind?: never
}

export type ProductionItem = UnitProductionItem | ResearchProductionItem

export interface ProductionData {
  readonly queue: readonly ProductionItem[]
}

const PRODUCTION_ITEM_TAGS = { UNIT: 0, RESEARCH: 1 } as const
const PRODUCTION_STATUS_TAGS = {
  ACTIVE: 0,
  QUEUED: 1,
  COMPLETED_WAITING: 2
} as const
const RESEARCH_TYPE_TAGS: Readonly<Record<ResearchType, number>> = {
  ATTACK: 0,
  DEFENSE: 1,
  ECONOMY: 2,
  MOVEMENT: 3
}

function productionStatusFromTag(tag: number): ProductionItemStatus {
  switch (tag) {
    case PRODUCTION_STATUS_TAGS.ACTIVE:
      return 'ACTIVE'
    case PRODUCTION_STATUS_TAGS.QUEUED:
      return 'QUEUED'
    case PRODUCTION_STATUS_TAGS.COMPLETED_WAITING:
      return 'COMPLETED_WAITING'
    default:
      throw new Error(`Production: invalid status tag ${tag}`)
  }
}

function trainableKindFromTag(tag: number): TrainableUnitKind {
  const kind = kindFromTag(tag)
  if (kind !== 'pawn' && kind !== 'warrior' && kind !== 'archer' && kind !== 'lancer' && kind !== 'monk') {
    throw new Error(`Production: invalid trainable unit kind ${kind}`)
  }
  return kind
}

function researchTypeFromTag(tag: number): ResearchType {
  if (tag === RESEARCH_TYPE_TAGS.ATTACK) {
    return 'ATTACK'
  }
  if (tag === RESEARCH_TYPE_TAGS.DEFENSE) {
    return 'DEFENSE'
  }
  if (tag === RESEARCH_TYPE_TAGS.ECONOMY) {
    return 'ECONOMY'
  }
  if (tag === RESEARCH_TYPE_TAGS.MOVEMENT) {
    return 'MOVEMENT'
  }
  throw new Error(`Production: invalid research type tag ${tag}`)
}

function writeCost(writer: CanonicalWriter, cost: ResourceCost): void {
  for (const type of RESOURCE_TYPES) {
    writer.writeI32(cost[type] ?? 0)
  }
}

function readCost(reader: CanonicalReader): ResourceCost {
  return { GOLD: reader.readI32(), WOOD: reader.readI32() }
}

export function isResearchProductionItem(item: ProductionItem): item is ResearchProductionItem {
  return item.researchType !== undefined
}

export const Production: ComponentType<ProductionData> = {
  name: 'production',
  encode(writer, value) {
    writer.writeLength(value.queue.length)
    for (const item of value.queue) {
      if (isResearchProductionItem(item)) {
        writer.writeU8(PRODUCTION_ITEM_TAGS.RESEARCH)
        writer.writeU8(RESEARCH_TYPE_TAGS[item.researchType])
        writeCost(writer, item.cost)
        writer.writeI32(item.progressTicks)
        writer.writeI32(item.totalTicks)
        writer.writeU8(PRODUCTION_STATUS_TAGS[item.status])
        continue
      }
      writer.writeU8(PRODUCTION_ITEM_TAGS.UNIT)
      writer.writeU8(kindTag(item.unitKind))
      writeCost(writer, item.cost)
      writer.writeI32(item.reservedSupply)
      writer.writeI32(item.progressTicks)
      writer.writeI32(item.totalTicks)
      writer.writeU8(PRODUCTION_STATUS_TAGS[item.status])
    }
  },
  decode(reader) {
    const count = reader.readLength()
    const queue: ProductionItem[] = []
    for (let index = 0; index < count; index += 1) {
      const itemTag = reader.readU8()
      if (itemTag === PRODUCTION_ITEM_TAGS.RESEARCH) {
        queue.push({
          researchType: researchTypeFromTag(reader.readU8()),
          cost: readCost(reader),
          progressTicks: reader.readI32(),
          totalTicks: reader.readI32(),
          status: productionStatusFromTag(reader.readU8())
        })
        continue
      }
      if (itemTag !== PRODUCTION_ITEM_TAGS.UNIT) {
        throw new Error(`Production: invalid item tag ${itemTag}`)
      }
      queue.push({
        unitKind: trainableKindFromTag(reader.readU8()),
        cost: readCost(reader),
        reservedSupply: reader.readI32(),
        progressTicks: reader.readI32(),
        totalTicks: reader.readI32(),
        status: productionStatusFromTag(reader.readU8())
      })
    }
    return { queue }
  }
}
