import { Movement, OrderQueue, Owner, Position } from './components.js'
import { World } from './world.js'

/**
 * Creates a world with the built-in components registered. Registration order
 * (Position, Owner, Movement, OrderQueue) is part of the canonical schema.
 */
export function createWorld(): World {
  const world = new World()
  world.registerComponent(Position)
  world.registerComponent(Owner)
  world.registerComponent(Movement)
  world.registerComponent(OrderQueue)
  return world
}
