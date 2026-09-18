import { Combat, Health, Movement, Orders, Owner, Position } from './components.js'
import { World } from './world.js'

/**
 * Creates a world with the built-in components registered. Registration order
 * (Position, Owner, Movement, Orders, Health, Combat) is part of the canonical
 * serialization schema.
 */
export function createWorld(): World {
  const world = new World()
  world.registerComponent(Position)
  world.registerComponent(Owner)
  world.registerComponent(Movement)
  world.registerComponent(Orders)
  world.registerComponent(Health)
  world.registerComponent(Combat)
  return world
}
