import { EXPLOSIVE_SHOT_COOLDOWN_TICKS, EXPLOSIVE_SHOT_COST, EXPLOSIVE_SHOT_RANGE_FIXED } from '@rts/game-data'
import { applyResourceCost, canAfford, distSquaredFixed, type EntityId } from '@rts/shared'
import type { ScheduledCommand } from '../contracts/commands.js'
import { effectiveDamage } from '../domain/research-effects.js'
import { Building } from '../ecs/building-component.js'
import { AbilityCooldown, Health, Kind, Owner, Position } from '../ecs/components.js'
import { launchProjectile } from '../projectiles/projectile-system.js'
import type { GameState } from '../state/state.js'
import { isEntityVisible } from '../vision/vision-state.js'
import { reject } from './reject.js'
import { validateControllableUnits } from './validate-units.js'

function validateTarget(state: GameState, command: ScheduledCommand, targetId: EntityId, archerId: EntityId): void {
  const targetOwner = state.world.store(Owner).get(targetId)
  const targetBuilding = state.world.store(Building).get(targetId)
  const targetPosition = state.world.store(Position).get(targetId)
  const archerPosition = state.world.store(Position).get(archerId)
  if (
    targetOwner === undefined ||
    targetPosition === undefined ||
    state.world.store(Health).get(targetId) === undefined
  ) {
    reject(command, 'ENTITY_UNAVAILABLE', `EXPLOSIVE_SHOT: target ${targetId} is unavailable`)
  }
  if (targetOwner.owner === command.playerId) {
    reject(command, 'NOT_OWNER', `EXPLOSIVE_SHOT: target ${targetId} is friendly`)
  }
  if (targetBuilding !== undefined && targetBuilding.status !== 'COMPLETED') {
    reject(command, 'INVALID_STATE', `EXPLOSIVE_SHOT: target ${targetId} is not a completed building`)
  }
  if (!isEntityVisible(state, command.playerId, targetId)) {
    reject(command, 'INVALID_STATE', `EXPLOSIVE_SHOT: target ${targetId} is hidden`)
  }
  if (
    archerPosition === undefined ||
    distSquaredFixed(archerPosition.x, archerPosition.y, targetPosition.x, targetPosition.y) >
      EXPLOSIVE_SHOT_RANGE_FIXED ** 2
  ) {
    reject(command, 'INVALID_STATE', `EXPLOSIVE_SHOT: target ${targetId} is out of range`)
  }
}

export function applyExplosiveShot(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'EXPLOSIVE_SHOT') {
    throw new Error('applyExplosiveShot: expected EXPLOSIVE_SHOT')
  }
  const { unitIds, targetId } = command.intent.payload
  validateControllableUnits(state, command, unitIds)
  if (unitIds.length !== 1 || state.world.store(Kind).get(unitIds[0]!) !== 'archer') {
    reject(command, 'INVALID_STATE', 'EXPLOSIVE_SHOT: exactly one Archer must be selected')
  }
  const archerId = unitIds[0]!
  const cooldown = state.world.store(AbilityCooldown).get(archerId)
  if (cooldown === undefined || cooldown.explosiveShotCooldownRemaining > 0) {
    reject(command, 'INVALID_STATE', `EXPLOSIVE_SHOT: Archer ${archerId} is on cooldown`)
  }
  validateTarget(state, command, targetId, archerId)
  const player = state.players.find((candidate) => candidate.id === command.playerId)
  if (player === undefined || !canAfford(player.resources, EXPLOSIVE_SHOT_COST)) {
    reject(command, 'INSUFFICIENT_RESOURCES', 'EXPLOSIVE_SHOT: insufficient Gold')
  }
  applyResourceCost(player.resources, EXPLOSIVE_SHOT_COST, -1)
  state.world.store(AbilityCooldown).set(archerId, {
    ...cooldown,
    explosiveShotCooldownRemaining: EXPLOSIVE_SHOT_COOLDOWN_TICKS + 1
  })
  launchProjectile(state, {
    sourceId: archerId,
    targetId,
    owner: command.playerId,
    kind: 'arrow',
    damage: effectiveDamage(state, archerId),
    explosive: true
  })
}
