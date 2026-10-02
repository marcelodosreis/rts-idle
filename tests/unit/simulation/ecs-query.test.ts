import { ComponentStore, createWorld, Movement, Owner, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'

describe('ECS query membership', () => {
  it('keeps sorted component ids cached across value overwrites', () => {
    const store = new ComponentStore<{ readonly value: number }>()
    store.set(3, { value: 1 })
    store.set(1, { value: 2 })

    const before = store.ids()
    store.set(1, { value: 3 })

    expect(store.ids()).toBe(before)
    expect(store.ids()).toEqual([1, 3])
  })

  it('does not record a semantically unchanged component write', () => {
    const world = createWorld()
    world.createEntity(1)
    world.store(Position).set(1, { x: 0, y: 0 })
    const cursor = world.changeCursor()
    world.store(Position).set(1, { x: 0, y: 0 })

    expect(world.changesSince(cursor).dirtyIds).toEqual([])
  })

  it('replaces the component snapshot only when membership changes', () => {
    const store = new ComponentStore<number>()
    store.set(2, 20)
    const before = store.ids()

    store.set(1, 10)
    const afterInsert = store.ids()
    store.delete(2)
    const afterDelete = store.ids()

    expect(before).toEqual([2])
    expect(afterInsert).toEqual([1, 2])
    expect(afterDelete).toEqual([1])
    expect(afterInsert).not.toBe(before)
    expect(afterDelete).not.toBe(afterInsert)
  })

  it('queries one or more components in ascending entity order', () => {
    const world = createWorld()
    for (const id of [9, 2, 7, 4]) {
      world.createEntity(id)
    }
    world.store(Position).set(9, { x: 0, y: 0 })
    world.store(Position).set(2, { x: 0, y: 0 })
    world.store(Position).set(7, { x: 0, y: 0 })
    world.store(Movement).set(7, { speedTilesPerSecondFixed: 1, destX: 0, destY: 0, remainderX: 0, remainderY: 0 })
    world.store(Movement).set(2, { speedTilesPerSecondFixed: 1, destX: 0, destY: 0, remainderX: 0, remainderY: 0 })

    expect(world.query(Position)).toEqual([2, 7, 9])
    expect(world.query(Position, Movement)).toEqual([2, 7])
    expect(world.query(Movement, Position)).toEqual([2, 7])
  })

  it('returns immutable membership snapshots across entity and component mutations', () => {
    const world = createWorld()
    world.createEntity(1)
    world.store(Position).set(1, { x: 0, y: 0 })
    const aliveBefore = world.aliveIds()
    const queryBefore = world.query(Position)

    world.createEntity(2)
    world.store(Position).set(2, { x: 1, y: 1 })
    world.removeEntity(1)

    expect(aliveBefore).toEqual([1])
    expect(queryBefore).toEqual([1])
    expect(world.aliveIds()).toEqual([2])
    expect(world.query(Position)).toEqual([2])
  })

  it('excludes component data for entities that are not alive', () => {
    const world = createWorld()
    world.store(Position).set(99, { x: 0, y: 0 })

    expect(world.query(Position)).toEqual([])
  })

  it('rejects empty and unregistered queries', () => {
    const world = createWorld()

    expect(() => world.query()).toThrow('requires at least one component')
    expect(() => world.query({ name: 'unknown' })).toThrow('not registered')
  })

  it('keeps query membership current after component deletion', () => {
    const world = createWorld()
    world.createEntity(1)
    world.store(Position).set(1, { x: 0, y: 0 })
    const before = world.query(Position)

    world.store(Position).delete(1)

    expect(before).toEqual([1])
    expect(world.query(Position)).toEqual([])
  })

  it('does not invalidate a component membership cache for a missing delete', () => {
    const world = createWorld()
    world.createEntity(1)
    world.store(Owner).set(1, { owner: 0 })
    const before = world.store(Owner).ids()

    world.store(Owner).delete(2)

    expect(world.store(Owner).ids()).toBe(before)
  })

  it('records authoritative entity creates, dirty writes, and removals', () => {
    const world = createWorld()
    world.createEntity(1)
    world.store(Position).set(1, { x: 0, y: 0 })
    const cursor = world.changeCursor()

    world.store(Position).set(1, { x: 1, y: 0 })
    world.createEntity(2)
    world.store(Position).set(2, { x: 2, y: 0 })
    world.removeEntity(1)

    expect(world.changesSince(cursor)).toEqual({
      cursor: world.changeCursor(),
      createdIds: [2],
      dirtyIds: [],
      removedIds: [1]
    })
  })

  it('returns no entity projections for an idle cursor regardless of entity count', () => {
    const world = createWorld()
    for (const id of Array.from({ length: 1_000 }, (_, index) => index + 1)) {
      world.createEntity(id)
      world.store(Position).set(id, { x: id, y: 0 })
    }
    const cursor = world.changeCursor()

    expect(world.changesSince(cursor)).toEqual({
      cursor,
      createdIds: [],
      dirtyIds: [],
      removedIds: []
    })
  })

  it('bounds mutation history and expires cursors older than retention', () => {
    const world = createWorld({ changeHistoryLimit: 3 })
    const initialCursor = world.changeCursor()

    for (let entityId = 1; entityId <= 100; entityId += 1) {
      world.createEntity(entityId)
    }

    expect(world.changeCursor()).toBe(100)
    expect(() => world.changesSince(initialCursor)).toThrow('change cursor 0 expired')
    expect(world.changesSince(97)).toEqual({
      cursor: 100,
      createdIds: [98, 99, 100],
      dirtyIds: [],
      removedIds: []
    })
  })
})
