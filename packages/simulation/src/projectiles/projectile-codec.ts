import { isPlayerId, PROJECTILE_KINDS } from '@rts/shared'
import type { CanonicalReader } from '../canonical/reader.js'
import type { CanonicalWriter } from '../canonical/writer.js'
import { cloneProjectileStore, type ProjectileState, type ProjectileStore } from './projectile-state.js'

const ARROW_TAG = 0

function writeProjectile(writer: CanonicalWriter, projectile: ProjectileState): void {
  writer.writeU32(projectile.id)
  writer.writeU8(projectile.kind === 'arrow' ? ARROW_TAG : 255)
  writer.writeU8(projectile.owner)
  writer.writeU32(projectile.sourceId)
  writer.writeU32(projectile.targetId)
  writer.writeI32(projectile.x)
  writer.writeI32(projectile.y)
  writer.writeI32(projectile.lastKnownX)
  writer.writeI32(projectile.lastKnownY)
  writer.writeI32(projectile.damage)
  writer.writeU8(projectile.explosive ? 1 : 0)
  writer.writeU32(projectile.remainingTtl)
  writer.writeU32(projectile.movementRemainder)
}

function readProjectile(reader: CanonicalReader): ProjectileState {
  const id = reader.readU32()
  const kindTag = reader.readU8()
  if (kindTag !== ARROW_TAG) {
    throw new Error(`readProjectile: invalid projectile kind ${kindTag}`)
  }
  const owner = reader.readU8()
  if (!isPlayerId(owner)) {
    throw new Error(`readProjectile: invalid projectile owner ${owner}`)
  }
  const projectile = {
    id,
    kind: PROJECTILE_KINDS[ARROW_TAG],
    owner,
    sourceId: reader.readU32(),
    targetId: reader.readU32(),
    x: reader.readI32(),
    y: reader.readI32(),
    lastKnownX: reader.readI32(),
    lastKnownY: reader.readI32(),
    damage: reader.readI32(),
    explosive: reader.readU8(),
    remainingTtl: reader.readU32(),
    movementRemainder: reader.readU32()
  }
  if (projectile.explosive !== 0 && projectile.explosive !== 1) {
    throw new Error(`readProjectile: invalid explosive flag ${projectile.explosive}`)
  }
  return { ...projectile, explosive: projectile.explosive === 1 }
}

export function writeProjectileStore(writer: CanonicalWriter, store: ProjectileStore): void {
  writer.writeU32(store.nextId)
  const projectiles = [...store.active.values()].sort((left, right) => left.id - right.id)
  writer.writeLength(projectiles.length)
  for (const projectile of projectiles) {
    writeProjectile(writer, projectile)
  }
}

export function readProjectileStore(reader: CanonicalReader): ProjectileStore {
  const nextId = reader.readU32()
  const active = new Map<number, ProjectileState>()
  let previousId = 0
  const count = reader.readLength()
  for (let index = 0; index < count; index += 1) {
    const projectile = readProjectile(reader)
    if (projectile.id <= previousId || active.has(projectile.id)) {
      throw new Error(`readProjectileStore: projectile IDs must be unique and ordered`)
    }
    previousId = projectile.id
    active.set(projectile.id, projectile)
  }
  if (nextId <= previousId) {
    throw new Error(`readProjectileStore: next ID ${nextId} is not ahead of active projectiles`)
  }
  return cloneProjectileStore({ nextId, active })
}
