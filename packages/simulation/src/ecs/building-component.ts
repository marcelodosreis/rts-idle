import type { BuildingStatus, BuildingType, Fixed } from '@rts/shared'
import type { CanonicalReader } from '../canonical/reader.js'
import type { CanonicalWriter } from '../canonical/writer.js'
import { buildingTypeFromTag, buildingTypeTag } from './codecs.js'
import type { ComponentType } from './components.js'

export type { BuildingStatus }

export interface BuildingData {
  readonly buildingType: BuildingType
  readonly status: BuildingStatus
  readonly progressTicks: number
  readonly totalTicks: number
  readonly builderId: number | null
  readonly footprint: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  readonly rallyPoint?: { readonly x: Fixed; readonly y: Fixed } | null
}

const STATUS_TAGS: Readonly<Record<BuildingStatus, number>> = {
  FOUNDATION: 0,
  UNDER_CONSTRUCTION: 1,
  COMPLETED: 2
}

const STATUS_BY_TAG: Readonly<Record<number, BuildingStatus>> = {
  0: 'FOUNDATION',
  1: 'UNDER_CONSTRUCTION',
  2: 'COMPLETED'
}

export const Building: ComponentType<BuildingData> = {
  name: 'building',
  encode(writer: CanonicalWriter, value) {
    writer.writeU8(buildingTypeTag(value.buildingType))
    writer.writeU8(STATUS_TAGS[value.status])
    writer.writeI32(value.progressTicks)
    writer.writeI32(value.totalTicks)
    writer.writeU8(value.builderId === null ? 0 : 1)
    if (value.builderId !== null) {
      writer.writeU32(value.builderId)
    }
    writer.writeI32(value.footprint.x)
    writer.writeI32(value.footprint.y)
    writer.writeI32(value.footprint.width)
    writer.writeI32(value.footprint.height)
    const rallyPoint = value.rallyPoint ?? null
    writer.writeU8(rallyPoint === null ? 0 : 1)
    if (rallyPoint !== null) {
      writer.writeI32(rallyPoint.x)
      writer.writeI32(rallyPoint.y)
    }
  },
  decode(reader: CanonicalReader) {
    const buildingType = buildingTypeFromTag(reader.readU8())
    const statusTag = reader.readU8()
    const status = STATUS_BY_TAG[statusTag]
    if (status === undefined) {
      throw new Error(`Building: invalid status tag ${statusTag}`)
    }
    const progressTicks = reader.readI32()
    const totalTicks = reader.readI32()
    const builderPresent = reader.readU8()
    if (builderPresent !== 0 && builderPresent !== 1) {
      throw new Error(`Building: invalid builder presence ${builderPresent}`)
    }
    const builderId = builderPresent === 1 ? reader.readU32() : null
    const footprint = { x: reader.readI32(), y: reader.readI32(), width: reader.readI32(), height: reader.readI32() }
    const rallyPresent = reader.readU8()
    if (rallyPresent !== 0 && rallyPresent !== 1) {
      throw new Error(`Building: invalid rally presence ${rallyPresent}`)
    }
    return {
      buildingType,
      status,
      progressTicks,
      totalTicks,
      builderId,
      footprint,
      rallyPoint: rallyPresent === 1 ? { x: reader.readI32(), y: reader.readI32() } : null
    }
  }
}
