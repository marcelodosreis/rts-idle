import { MONK_HEAL_RANGE_FIXED, unitDefinitionFor } from '@rts/game-data'
import { distSquaredFixed, type EntityId } from '@rts/shared'
import { CommandRejectedError, type ScheduledCommand } from '../contracts/commands.js'
import { Building } from '../ecs/building-component.js'
import { AbilityCooldown, Health, Kind, Owner, Position } from '../ecs/components.js'
import { setMovementDestination } from '../movement/destination.js'
import { setOrders } from '../orders/order-queue.js'
import type { GameState } from '../state/state.js'
import { validateOwnedUnits } from './validate-units.js'

function reject(command: ScheduledCommand, message: string): never {
  throw new CommandRejectedError('INVALID_STATE', command, message)
}

function validateTarget(state: GameState, command: ScheduledCommand, targetId: EntityId): void {
  const owners = state.world.store(Owner)
  const health = state.world.store(Health).get(targetId)
  if (
    !state.world.hasEntity(targetId) ||
    owners.get(targetId) === undefined ||
    health === undefined ||
    state.world.store(Building).has(targetId)
  ) {
    reject(command, `HEAL: target ${targetId} is not a unit`)
  }
  if (owners.get(targetId)?.owner !== command.playerId) {
    reject(command, `HEAL: target ${targetId} is not allied`)
  }
  if (health.current >= health.max) {
    reject(command, `HEAL: target ${targetId} is already at full health`)
  }
}

function validateMonk(state: GameState, command: ScheduledCommand, monkId: EntityId): void {
  const kinds = state.world.store(Kind)
  const kind = kinds.get(monkId)
  if (kind === undefined || !unitDefinitionFor(kind).canHeal) {
    reject(command, `HEAL: caster ${monkId} cannot heal`)
  }
  const cooldown = state.world.store(AbilityCooldown).get(monkId)
  if (cooldown === undefined || cooldown.healCooldownRemaining > 0) {
    reject(command, `HEAL: Monk ${monkId} is on cooldown`)
  }
}

export function applyHeal(state: GameState, command: ScheduledCommand): void {
  if (command.intent.type !== 'HEAL') {
    throw new Error('applyHeal: expected a HEAL command')
  }
  const { unitIds, targetId } = command.intent.payload
  validateOwnedUnits(state, command, unitIds)
  if (unitIds.length !== 1) {
    reject(command, 'HEAL: exactly one Monk must be selected')
  }
  const monkId = unitIds[0]!
  validateMonk(state, command, monkId)
  validateTarget(state, command, targetId)
  setOrders(state, monkId, [{ type: 'HEAL', targetId }])
  const monkPosition = state.world.store(Position).get(monkId)
  const targetPosition = state.world.store(Position).get(targetId)
  if (monkPosition === undefined || targetPosition === undefined) {
    reject(command, 'HEAL: caster or target has no position')
  }
  if (
    distSquaredFixed(monkPosition.x, monkPosition.y, targetPosition.x, targetPosition.y) >
    MONK_HEAL_RANGE_FIXED ** 2
  ) {
    setMovementDestination(state, monkId, targetPosition.x, targetPosition.y)
  }
}
