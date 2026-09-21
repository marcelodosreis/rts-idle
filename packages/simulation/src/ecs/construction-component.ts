import type { BuildingType } from '@rts/shared'
import type { CanonicalReader } from '../canonical/reader.js'
import type { CanonicalWriter } from '../canonical/writer.js'
import type { ComponentType } from './components.js'

export type ConstructionStatus = 'FOUNDATION' | 'UNDER_CONSTRUCTION' | 'COMPLETED'

export interface ConstructionData {
  readonly buildingType: BuildingType
  readonly status: ConstructionStatus
  readonly progressTicks: number
  readonly totalTicks: number
  readonly builderId: number | null
  readonly footprint: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
}

const CONSTRUCTION_STATUS_TAGS = { FOUNDATION: 0, UNDER_CONSTRUCTION: 1, COMPLETED: 2 } as const

export const Construction: ComponentType<ConstructionData> = {
  name: 'construction',
  encode(writer: CanonicalWriter, value) {
    writer.writeU8(value.buildingType === 'BASE' ? 0 : 255)
    writer.writeU8(CONSTRUCTION_STATUS_TAGS[value.status])
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
  },
  decode(reader: CanonicalReader) {
    const buildingType = reader.readU8()
    if (buildingType !== 0) {
      throw new Error(`Construction: invalid building type tag ${buildingType}`)
    }
    const statusTag = reader.readU8()
    const status = (Object.keys(CONSTRUCTION_STATUS_TAGS) as ConstructionStatus[]).find(
      (candidate) => CONSTRUCTION_STATUS_TAGS[candidate] === statusTag
    )
    if (status === undefined) {
      throw new Error(`Construction: invalid status tag ${statusTag}`)
    }
    const progressTicks = reader.readI32()
    const totalTicks = reader.readI32()
    const builderPresent = reader.readU8()
    if (builderPresent !== 0 && builderPresent !== 1) {
      throw new Error(`Construction: invalid builder presence ${builderPresent}`)
    }
    const builderId = builderPresent === 1 ? reader.readU32() : null
    return {
      buildingType: 'BASE',
      status,
      progressTicks,
      totalTicks,
      builderId,
      footprint: { x: reader.readI32(), y: reader.readI32(), width: reader.readI32(), height: reader.readI32() }
    }
  }
}
