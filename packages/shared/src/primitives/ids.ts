export type EntityId = number

export const START_ENTITY_ID = 1

export const MAX_ENTITY_ID = Number.MAX_SAFE_INTEGER - 1

export function peekEntityId(nextEntityId: number): EntityId {
  if (!Number.isInteger(nextEntityId)) {
    throw new Error(`peekEntityId: nextEntityId must be an integer, got ${nextEntityId}`)
  }
  if (nextEntityId > MAX_ENTITY_ID) {
    throw new Error(`peekEntityId: entity id overflow at ${nextEntityId}`)
  }
  return nextEntityId
}

export function allocateEntityId(nextEntityId: number): { readonly id: EntityId; readonly nextEntityId: number } {
  const id = peekEntityId(nextEntityId)
  return { id, nextEntityId: id + 1 }
}
