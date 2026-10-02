import { Building } from './building-component.js'
import {
  AbilityCooldown,
  Cargo,
  Combat,
  Health,
  Kind,
  Movement,
  Orders,
  Owner,
  Position,
  Production
} from './components.js'
import { World, type WorldOptions } from './world.js'

/**
 * Creates a world with the built-in components registered. Registration order
 * Registration order is part of the canonical serialization schema.
 */
export function createWorld(options: WorldOptions = {}): World {
  const world = new World(options.instrumentation, options.changeHistoryLimit)
  world.registerComponent(Position)
  world.registerComponent(Owner)
  world.registerComponent(Movement)
  world.registerComponent(Orders)
  world.registerComponent(Health)
  world.registerComponent(Combat)
  world.registerComponent(AbilityCooldown)
  world.registerComponent(Kind)
  world.registerComponent(Building)
  world.registerComponent(Cargo)
  world.registerComponent(Production)
  return world
}
