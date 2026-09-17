import { allocateEntityId, START_ENTITY_ID } from '@rts/shared'
import { createWorld, Owner, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'

describe('minimal ECS lifecycle', () => {
  it('creates entities with allocated ids', () => {
    const world = createWorld()
    let nextEntityId = START_ENTITY_ID
    const alloc = allocateEntityId(nextEntityId)
    world.createEntity(alloc.id)
    nextEntityId = alloc.nextEntityId

    expect(world.hasEntity(alloc.id)).toBe(true)
    expect(world.aliveIds()).toEqual([alloc.id])
  })

  it('rejects duplicate ids', () => {
    const world = createWorld()
    world.createEntity(7)
    expect(() => world.createEntity(7)).toThrow()
  })

  it('removes entities and their component data', () => {
    const world = createWorld()
    const alloc = allocateEntityId(START_ENTITY_ID)
    world.createEntity(alloc.id)
    world.store(Position).set(alloc.id, { x: 10, y: 20 })
    world.store(Owner).set(alloc.id, { owner: 1 })

    world.removeEntity(alloc.id)

    expect(world.hasEntity(alloc.id)).toBe(false)
    expect(world.store(Position).has(alloc.id)).toBe(false)
    expect(world.store(Owner).has(alloc.id)).toBe(false)
  })

  it('lists alive ids in ascending order', () => {
    const world = createWorld()
    for (const id of [3, 1, 2]) {
      world.createEntity(id)
    }
    expect(world.aliveIds()).toEqual([1, 2, 3])
  })

  it('stores and retrieves component data', () => {
    const world = createWorld()
    world.createEntity(5)
    world.store(Position).set(5, { x: 100, y: 200 })
    expect(world.store(Position).get(5)).toEqual({ x: 100, y: 200 })
    expect(world.store(Owner).has(5)).toBe(false)
  })
})
