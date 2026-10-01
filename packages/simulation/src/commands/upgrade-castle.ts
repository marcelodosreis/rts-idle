import { BUILDING_DEFINITIONS } from '@rts/game-data'
import { applyResourceCost, canAfford } from '@rts/shared'
import type { ScheduledCommand } from '../contracts/commands.js'
import { Building } from '../ecs/building-component.js'
import { Owner, Production } from '../ecs/components.js'
import type { GameState } from '../state/state.js'
import { reject } from './reject.js'

export function applyUpgradeCastle(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'UPGRADE_CASTLE') {
    throw new Error('applyUpgradeCastle: expected UPGRADE_CASTLE')
  }
  const { castleId } = command.intent.payload
  const player = state.players.find((candidate) => candidate.id === command.playerId)
  const building = state.world.store(Building).get(castleId)
  if (player === undefined || player.defeated) {
    reject(command, 'INVALID_PHASE', 'UPGRADE_CASTLE: player is not active')
  }
  if (building?.buildingType !== 'CASTLE' || building.status !== 'COMPLETED') {
    reject(command, 'INVALID_STATE', 'UPGRADE_CASTLE: target is not a completed Castle')
  }
  if (state.world.store(Owner).get(castleId)?.owner !== command.playerId) {
    reject(command, 'NOT_OWNER', 'UPGRADE_CASTLE: player does not own Castle')
  }
  if ((building.tier ?? 1) !== 1 || (building.tierUpgrade !== undefined && building.tierUpgrade !== null)) {
    reject(command, 'INVALID_STATE', 'UPGRADE_CASTLE: Castle cannot upgrade')
  }
  if ((state.world.store(Production).get(castleId)?.queue.length ?? 0) > 0) {
    reject(command, 'INVALID_STATE', 'UPGRADE_CASTLE: Castle Pawn queue must be empty')
  }
  const definition = BUILDING_DEFINITIONS.CASTLE
  if (!canAfford(player.resources, definition.cost)) {
    reject(command, 'INSUFFICIENT_RESOURCES', 'UPGRADE_CASTLE: insufficient resources')
  }
  applyResourceCost(player.resources, definition.cost, -1)
  state.world.store(Building).set(castleId, {
    ...building,
    tier: 1,
    tierUpgrade: { progressTicks: 0, totalTicks: definition.constructionTicks }
  })
}
