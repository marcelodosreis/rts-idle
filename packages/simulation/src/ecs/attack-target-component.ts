import type { EntityId, Fixed } from '@rts/shared'
import type { CanonicalReader } from '../canonical/reader.js'
import type { CanonicalWriter } from '../canonical/writer.js'
import type { ComponentType } from './components.js'

export interface AttackTargetData {
  readonly targetId: EntityId | null
  readonly lastKnownX: Fixed | null
  readonly lastKnownY: Fixed | null
  readonly lostVision: boolean
}

export const AttackTarget: ComponentType<AttackTargetData> = {
  name: 'attackTarget',
  encode(writer: CanonicalWriter, value) {
    writer.writeU8(value.targetId === null ? 0 : 1)
    if (value.targetId !== null) {
      writer.writeU32(value.targetId)
    }
    const hasPosition = value.lastKnownX !== null && value.lastKnownY !== null
    writer.writeU8(hasPosition ? 1 : 0)
    if (hasPosition) {
      writer.writeI32(value.lastKnownX!)
      writer.writeI32(value.lastKnownY!)
    }
    writer.writeU8(value.lostVision ? 1 : 0)
  },
  decode(reader: CanonicalReader) {
    const targetPresent = reader.readU8()
    if (targetPresent !== 0 && targetPresent !== 1) {
      throw new Error(`AttackTarget: invalid target presence ${targetPresent}`)
    }
    const targetId = targetPresent === 1 ? reader.readU32() : null
    const positionPresent = reader.readU8()
    if (positionPresent !== 0 && positionPresent !== 1) {
      throw new Error(`AttackTarget: invalid position presence ${positionPresent}`)
    }
    const lastKnownX = positionPresent === 1 ? reader.readI32() : null
    const lastKnownY = positionPresent === 1 ? reader.readI32() : null
    const lostVision = reader.readU8()
    if (lostVision !== 0 && lostVision !== 1) {
      throw new Error(`AttackTarget: invalid lost-vision flag ${lostVision}`)
    }
    return { targetId, lastKnownX, lastKnownY, lostVision: lostVision === 1 }
  }
}
