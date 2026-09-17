import { Attack, Health, Movement, OrderQueue, Owner, Position, UnitClass } from './components.js'
import { World } from './world.js'

/**
 * Creates a world with the built-in components registered. Registration order
 * (Position, Owner, Movement, OrderQueue, UnitClass, Health, Attack) is part of
 * the canonical schema.
 */
export function createWorld(): World {
  const world = new World()
  world.registerComponent(Position)
  world.registerComponent(Owner)
  world.registerComponent(Movement)
  world.registerComponent(OrderQueue)
  world.registerComponent(UnitClass)
  world.registerComponent(Health)
  world.registerComponent(Attack)
  return world
}
