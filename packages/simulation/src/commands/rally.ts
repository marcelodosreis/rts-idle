import type { ScheduledCommand } from '../contracts/commands.js'
import { Building } from '../ecs/building-component.js'
import { Owner } from '../ecs/components.js'
import type { GameState } from '../state/state.js'
import { reject } from './reject.js'
import { validateIntegerTarget } from './validate-units.js'

/** Stores a rally point on an owned, completed production building. */
export function applyRally(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'RALLY') {
    throw new Error('applyRally: expected a RALLY command')
  }
  const { producerId, x, y } = command.intent.payload
  validateIntegerTarget(command, x, y)
  const building = state.world.store(Building).get(producerId)
  if (building === undefined) {
    reject(command, 'ENTITY_UNAVAILABLE', `RALLY: producer ${producerId} does not exist`)
  }
  if (building.status !== 'COMPLETED') {
    reject(command, 'INVALID_STATE', `RALLY: producer ${producerId} is not complete`)
  }
  if (
    building.buildingType !== 'CASTLE' &&
    building.buildingType !== 'BARRACKS' &&
    building.buildingType !== 'ARCHERY' &&
    building.buildingType !== 'MONASTERY'
  ) {
    reject(command, 'INVALID_STATE', `RALLY: building ${producerId} cannot produce units`)
  }
  if (state.world.store(Owner).get(producerId)?.owner !== command.playerId) {
    reject(command, 'NOT_OWNER', `RALLY: player ${command.playerId} does not own producer ${producerId}`)
  }
  state.world.store(Building).set(producerId, { ...building, rallyPoint: { x, y } })
}
