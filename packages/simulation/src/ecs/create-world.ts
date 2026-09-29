import { Building } from './building-component.js'
import {
  Cargo,
  Combat,
  Health,
  Kind,
  MineralNode,
  Movement,
  Orders,
  Owner,
  Position,
  Production
} from './components.js'
import { World } from './world.js'

/**
 * Creates a world with the built-in components registered. Registration order
 * Registration order is part of the canonical serialization schema.
 */
export function createWorld(): World {
  const world = new World()
  world.registerComponent(Position)
  world.registerComponent(Owner)
  world.registerComponent(Movement)
  world.registerComponent(Orders)
  world.registerComponent(Health)
  world.registerComponent(Combat)
  world.registerComponent(Kind)
  world.registerComponent(MineralNode)
  world.registerComponent(Building)
  world.registerComponent(Cargo)
  world.registerComponent(Production)
  return world
}
