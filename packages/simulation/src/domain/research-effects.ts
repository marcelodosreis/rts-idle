import { RESEARCH_DEFINITIONS, unitDefinitionFor } from '@rts/game-data'
import type { ResearchType } from '@rts/shared'
import { Cargo, Combat, Kind, Owner } from '../ecs/components.js'
import type { GameState } from '../state/state.js'

export function playerHasResearch(state: GameState, ownerId: number, researchType: ResearchType): boolean {
  return state.players.find((player) => player.id === ownerId)?.completedResearch.includes(researchType) ?? false
}

export function effectiveDamage(state: GameState, attackerId: number): number {
  const combat = state.world.store(Combat).get(attackerId)
  const owner = state.world.store(Owner).get(attackerId)
  const kind = state.world.store(Kind).get(attackerId)
  if (combat === undefined) {
    return 0
  }
  if (owner === undefined || kind === undefined) {
    return combat.damage
  }
  const effect = RESEARCH_DEFINITIONS.ATTACK.effects.damageBonus ?? 0
  return playerHasResearch(state, owner.owner, 'ATTACK') && unitDefinitionFor(kind).militaryAttackUpgrade
    ? combat.damage + effect
    : combat.damage
}

export function effectiveArmor(state: GameState, targetId: number): number {
  const combat = state.world.store(Combat).get(targetId)
  const owner = state.world.store(Owner).get(targetId)
  const kind = state.world.store(Kind).get(targetId)
  if (combat === undefined) {
    return 0
  }
  if (owner === undefined || kind === undefined) {
    return combat.armor ?? 0
  }
  const effect = RESEARCH_DEFINITIONS.DEFENSE.effects.armorBonus ?? 0
  return (
    (combat.armor ?? 0) +
    (unitDefinitionFor(kind).militaryDefenseUpgrade && playerHasResearch(state, owner.owner, 'DEFENSE') ? effect : 0)
  )
}

export function effectiveCargoCapacity(state: GameState, unitId: number, baseCapacity: number): number {
  const kind = state.world.store(Kind).get(unitId)
  const owner = state.world.store(Owner).get(unitId)
  return kind !== undefined &&
    unitDefinitionFor(kind).economyUpgrade &&
    owner !== undefined &&
    playerHasResearch(state, owner.owner, 'ECONOMY')
    ? (RESEARCH_DEFINITIONS.ECONOMY.effects.cargoCapacity ?? baseCapacity)
    : baseCapacity
}

export function effectiveMovementSpeed(state: GameState, unitId: number, baseSpeed: number): number {
  const kind = state.world.store(Kind).get(unitId)
  const owner = state.world.store(Owner).get(unitId)
  if (
    owner === undefined ||
    kind === undefined ||
    !unitDefinitionFor(kind).movementUpgrade ||
    !playerHasResearch(state, owner.owner, 'MOVEMENT')
  ) {
    return baseSpeed
  }
  const multiplier = RESEARCH_DEFINITIONS.MOVEMENT.effects.movementSpeedMultiplier
  return multiplier === undefined ? baseSpeed : (baseSpeed * multiplier.numerator) / multiplier.denominator
}

export function refreshEconomyResearch(state: GameState, ownerId: number): void {
  if (!playerHasResearch(state, ownerId, 'ECONOMY')) {
    return
  }
  const owners = state.world.store(Owner)
  const cargos = state.world.store(Cargo)
  for (const id of state.world.query(Owner, Cargo)) {
    if (owners.get(id)?.owner === ownerId && cargos.has(id)) {
      const cargo = cargos.get(id)!
      cargos.set(id, {
        ...cargo,
        capacity: RESEARCH_DEFINITIONS.ECONOMY.effects.cargoCapacity ?? cargo.capacity
      })
    }
  }
}
