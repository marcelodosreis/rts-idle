import type { BuildingType } from '@rts/shared'
import type { CanonicalReader } from '../canonical/reader.js'
import type { CanonicalWriter } from '../canonical/writer.js'
import type { ComponentType } from './components.js'

export type BuildingStatus = 'FOUNDATION' | 'UNDER_CONSTRUCTION' | 'COMPLETED'

export interface BuildingData {
  readonly buildingType: BuildingType
  readonly status: BuildingStatus
  readonly progressTicks: number
  readonly totalTicks: number
  readonly builderId: number | null
  readonly footprint: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
}

const STATUS_TAGS = { FOUNDATION: 0, UNDER_CONSTRUCTION: 1, COMPLETED: 2 } as const

function buildingTypeTag(buildingType: BuildingType): number {
  return buildingType === 'BASE' ? 0 : 1
}

export const Building: ComponentType<BuildingData> = {
  name: 'building',
  encode(writer: CanonicalWriter, value) {
    const legacy = value.buildingType === undefined
    const building = legacy
      ? {
          buildingType: 'BASE' as const,
          status: 'COMPLETED' as const,
          progressTicks: 1,
          totalTicks: 1,
          builderId: null,
          footprint: { x: 0, y: 0, width: 1, height: 1 }
        }
      : value
    writer.writeU8(buildingTypeTag(building.buildingType))
    writer.writeU8(STATUS_TAGS[building.status])
    writer.writeI32(building.progressTicks)
    writer.writeI32(building.totalTicks)
    writer.writeU8(building.builderId === null ? 0 : 1)
    if (building.builderId !== null) {
      writer.writeU32(building.builderId)
    }
    writer.writeI32(building.footprint.x)
    writer.writeI32(building.footprint.y)
    writer.writeI32(building.footprint.width)
    writer.writeI32(building.footprint.height)
  },
  decode(reader: CanonicalReader) {
    const buildingType = reader.readU8()
    if (buildingType !== 0 && buildingType !== 1) {
      throw new Error(`Building: invalid building type tag ${buildingType}`)
    }
    const statusTag = reader.readU8()
    const status = (Object.keys(STATUS_TAGS) as BuildingStatus[]).find(
      (candidate) => STATUS_TAGS[candidate] === statusTag
    )
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
    return {
      buildingType: buildingType === 0 ? 'BASE' : 'BARRACKS',
      status,
      progressTicks,
      totalTicks,
      builderId,
      footprint: { x: reader.readI32(), y: reader.readI32(), width: reader.readI32(), height: reader.readI32() }
    }
  }
}
