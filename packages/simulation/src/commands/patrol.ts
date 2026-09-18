import type { ScheduledCommand } from '../contracts/commands.js'
import { Movement, Orders, Position } from '../ecs/components.js'
import type { GameState } from '../state/state.js'
import { UNIT_SPEED_TILES_PER_SECOND } from './move.js'
import { validateIntegerTarget, validateOwnedUnits } from './validate-units.js'

/**
 * PATROL sets each selected unit to walk back and forth between its current
 * position (the home leg) and the commanded destination (the target leg). The
 * queue alternates both legs; the orders system advances the front leg and
 * re-appends the finished one on arrival.
 */
export function applyPatrol(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'PATROL') {
    throw new Error('applyPatrol: expected a PATROL command')
  }
  const payload = command.intent.payload
  validateOwnedUnits(state, command, payload.unitIds)
  validateIntegerTarget(command, payload.x, payload.y)
  const orders = state.world.store(Orders)
  const movements = state.world.store(Movement)
  const positions = state.world.store(Position)
  for (const unitId of payload.unitIds) {
    const home = positions.get(unitId)
    if (home === undefined) {
      continue
    }
    orders.set(unitId, {
      queue: [
        { type: 'PATROL', x: payload.x, y: payload.y },
        { type: 'PATROL', x: home.x, y: home.y }
      ]
    })
    movements.set(unitId, {
      speedTilesPerSecond: UNIT_SPEED_TILES_PER_SECOND,
      destX: payload.x,
      destY: payload.y,
      remainderX: 0,
      remainderY: 0
    })
  }
}
