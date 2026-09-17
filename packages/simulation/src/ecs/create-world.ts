import { Owner, Position } from './components.js'
import { World } from './world.js'

/**
 * Creates a world with the built-in components registered. Registration order
 * (Position, then Owner) is part of the canonical serialization schema.
 */
export function createWorld(): World {
  const world = new World()
  world.registerComponent(Position)
  world.registerComponent(Owner)
  return world
}
