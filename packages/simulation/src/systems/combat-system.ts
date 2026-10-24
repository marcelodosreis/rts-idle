import { unitCanAttack, unitDefinitionFor } from '@rts/game-data'
import type { SpatialBounds } from '@rts/pathfinding'
import { distSquaredFixed, type EntityId, FIXED_SCALE, type PlayerId } from '@rts/shared'
import type { Order } from '../contracts/orders.js'
import { effectiveArmor, effectiveDamage } from '../domain/research-effects.js'
import { AttackTarget, type AttackTargetData } from '../ecs/attack-target-component.js'
import { Building } from '../ecs/building-component.js'
import { Combat, Kind, Orders, Owner, Position } from '../ecs/components.js'
import { clearMovement, setMovementDestination } from '../movement/destination.js'
import { clearOrders } from '../orders/order-queue.js'
import { advanceProjectiles, launchProjectile } from '../projectiles/projectile-system.js'
import { createWorldSpatialIndex } from '../spatial/world-spatial-index.js'
import type { GameState } from '../state/state.js'
import { isEntityVisible } from '../vision/vision-state.js'

const TARGET_PRIORITY_COMBATANT = 0
const TARGET_PRIORITY_WORKER = 1
const TARGET_PRIORITY_BUILDING = 2

interface TargetCandidate {
  readonly id: EntityId
  readonly priority: number
  readonly distance: number
}

interface NearestEnemyQuery {
  readonly state: GameState
  readonly selfId: EntityId
  readonly position: { readonly x: number; readonly y: number }
  readonly ownerId: PlayerId
  readonly rangeFixed: number
  readonly index: ReturnType<typeof createWorldSpatialIndex>
}

function targetPriority(state: GameState, id: EntityId): number {
  if (state.world.store(Building).has(id)) {
    return TARGET_PRIORITY_BUILDING
  }
  return state.world.store(Kind).get(id) === 'pawn' ? TARGET_PRIORITY_WORKER : TARGET_PRIORITY_COMBATANT
}

function preferredTarget(candidate: TargetCandidate, current: TargetCandidate | null): boolean {
  if (current === null) {
    return true
  }
  if (candidate.priority !== current.priority) {
    return candidate.priority < current.priority
  }
  if (candidate.distance !== current.distance) {
    return candidate.distance < current.distance
  }
  return candidate.id < current.id
}

function targetBounds(position: { readonly x: number; readonly y: number }, rangeFixed: number): SpatialBounds {
  return {
    minX: position.x - rangeFixed,
    minY: position.y - rangeFixed,
    maxX: position.x + rangeFixed,
    maxY: position.y + rangeFixed
  }
}

/** Finds the best visible living enemy within range using the spatial index. */
function nearestEnemyInRange(query: NearestEnemyQuery): EntityId | null {
  const { state, selfId, position, ownerId, rangeFixed, index } = query
  const positions = state.world.store(Position)
  const owners = state.world.store(Owner)
  let best: TargetCandidate | null = null
  const candidates = new Set([
    ...index.units.query(targetBounds(position, rangeFixed)),
    ...index.buildings.query(targetBounds(position, rangeFixed))
  ])
  for (const other of candidates) {
    if (other === selfId) {
      continue
    }
    const otherOwner = owners.get(other)
    if (otherOwner === undefined || otherOwner.owner === ownerId) {
      continue
    }
    const otherPosition = positions.get(other)
    if (otherPosition === undefined) {
      continue
    }
    const distance = distSquaredFixed(position.x, position.y, otherPosition.x, otherPosition.y)
    if (
      distance <= rangeFixed * rangeFixed &&
      isEntityVisible(state, ownerId, other) &&
      preferredTarget({ id: other, priority: targetPriority(state, other), distance }, best)
    ) {
      best = { id: other, priority: targetPriority(state, other), distance }
    }
  }
  return best?.id ?? null
}

interface TargetQuery {
  readonly state: GameState
  readonly id: EntityId
  readonly front: Order
  readonly position: { readonly x: number; readonly y: number }
  readonly ownerId: PlayerId
  readonly rangeFixed: number
  readonly index: ReturnType<typeof createWorldSpatialIndex>
}

interface ResolvedTarget {
  readonly id: EntityId
  readonly position: { readonly x: number; readonly y: number }
  readonly lostVision: boolean
}

function knownPosition(target: AttackTargetData): { readonly x: number; readonly y: number } | null {
  if (target.lastKnownX === null || target.lastKnownY === null) {
    return null
  }
  return { x: target.lastKnownX, y: target.lastKnownY }
}

function markTargetLost(
  state: GameState,
  id: EntityId,
  target: AttackTargetData
): { readonly x: number; readonly y: number } | null {
  state.world.store(AttackTarget).set(id, { ...target, lostVision: true })
  return knownPosition(target)
}

function resolveExplicitTarget(
  state: GameState,
  id: EntityId,
  targetId: EntityId,
  ownerId: PlayerId
): ResolvedTarget | null {
  const owners = state.world.store(Owner)
  if (!state.world.hasEntity(targetId) || owners.get(targetId)?.owner === ownerId) {
    clearOrders(state, id)
    return null
  }
  const targeting = state.world.store(AttackTarget)
  const current = targeting.get(id) ?? { targetId, lastKnownX: null, lastKnownY: null, lostVision: false }
  const lastKnown = knownPosition(current)
  if (current.lostVision) {
    return lastKnown === null ? null : { id: targetId, position: lastKnown, lostVision: true }
  }
  const targetPosition = state.world.store(Position).get(targetId)
  if (targetPosition === undefined || !isEntityVisible(state, ownerId, targetId)) {
    const lost = markTargetLost(state, id, current)
    return lost === null ? null : { id: targetId, position: lost, lostVision: true }
  }
  targeting.set(id, { targetId, lastKnownX: targetPosition.x, lastKnownY: targetPosition.y, lostVision: false })
  return { id: targetId, position: targetPosition, lostVision: false }
}

function resolveAttackMoveTarget(state: GameState, id: EntityId, ownerId: PlayerId): ResolvedTarget | null {
  const targeting = state.world.store(AttackTarget)
  const current = targeting.get(id)
  if (current?.targetId === null || current === undefined) {
    return null
  }
  const targetId = current.targetId
  const owners = state.world.store(Owner)
  if (!state.world.hasEntity(targetId) || owners.get(targetId)?.owner === ownerId) {
    targeting.delete(id)
    return null
  }
  const lastKnown = knownPosition(current)
  if (current.lostVision) {
    return lastKnown === null ? null : { id: targetId, position: lastKnown, lostVision: true }
  }
  const targetPosition = state.world.store(Position).get(targetId)
  if (targetPosition === undefined || !isEntityVisible(state, ownerId, targetId)) {
    const lost = markTargetLost(state, id, current)
    return lost === null ? null : { id: targetId, position: lost, lostVision: true }
  }
  targeting.set(id, { targetId, lastKnownX: targetPosition.x, lastKnownY: targetPosition.y, lostVision: false })
  return { id: targetId, position: targetPosition, lostVision: false }
}

/**
 * Resolves a combat unit's target from its front order. ATTACK commits to the
 * commanded target while visible, then moves to its last known position without
 * reading the hidden target's current position. HOLD and ATTACK_MOVE auto-acquire
 * the nearest visible enemy in range.
 */
function resolveTarget(query: TargetQuery): ResolvedTarget | null {
  const { state, id, front, position, ownerId, rangeFixed, index } = query
  if (front.type === 'ATTACK') {
    return resolveExplicitTarget(state, id, front.targetId, ownerId)
  }
  if (front.type === 'ATTACK_MOVE') {
    const tracked = resolveAttackMoveTarget(state, id, ownerId)
    if (tracked !== null) {
      return tracked
    }
    const targetId = nearestEnemyInRange({ state, selfId: id, position, ownerId, rangeFixed, index })
    if (targetId === null) {
      return null
    }
    const targetPosition = state.world.store(Position).get(targetId)
    if (targetPosition === undefined) {
      return null
    }
    state.world.store(AttackTarget).set(id, {
      targetId,
      lastKnownX: targetPosition.x,
      lastKnownY: targetPosition.y,
      lostVision: false
    })
    return { id: targetId, position: targetPosition, lostVision: false }
  }
  if (front.type === 'HOLD') {
    const targetId = nearestEnemyInRange({ state, selfId: id, position, ownerId, rangeFixed, index })
    if (targetId === null) {
      return null
    }
    const targetPosition = state.world.store(Position).get(targetId)
    return targetPosition === undefined ? null : { id: targetId, position: targetPosition, lostVision: false }
  }
  return null
}

/**
 * Adds an attack's damage to the per-tick buffer and starts the cooldown.
 * Damage is not applied yet: the death step resolves the full tick's
 * simultaneous damage.
 */
function accumulateDamage(state: GameState, targetId: EntityId, attackerId: EntityId, damage: number): void {
  const existing = state.pendingDamage.get(targetId)
  state.pendingDamage.set(targetId, {
    amount: (existing?.amount ?? 0) + damage,
    attackerId
  })
  state.events.push({ type: 'attackFired', attackerId, targetId })
}

interface CombatTargetAction {
  readonly state: GameState
  readonly id: EntityId
  readonly front: Order
  readonly position: { readonly x: number; readonly y: number }
  readonly target: ResolvedTarget
  readonly combat: {
    readonly armor: number
    readonly damage: number
    readonly rangeTiles: number
    readonly cooldownTicks: number
    readonly cooldownRemaining: number
  }
  readonly cooldownRemaining: number
}

function applyCombatTarget(action: CombatTargetAction): void {
  const { state, id, front, position, target, combat, cooldownRemaining } = action
  const rangeFixed = combat.rangeTiles * FIXED_SCALE
  const inRange =
    distSquaredFixed(position.x, position.y, target.position.x, target.position.y) <= rangeFixed * rangeFixed
  if (target.lostVision) {
    if (position.x === target.position.x && position.y === target.position.y) {
      clearMovement(state, id)
    } else {
      setMovementDestination(state, id, target.position.x, target.position.y)
    }
    return
  }
  if (inRange) {
    clearMovement(state, id)
    if (cooldownRemaining === 0) {
      const damage = effectiveDamage(state, id)
      const projectile = unitDefinitionFor(state.world.store(Kind).get(id)!).projectile
      if (projectile === null) {
        const armor = effectiveArmor(state, target.id)
        accumulateDamage(state, target.id, id, Math.max(1, damage - armor))
      } else {
        const owner = state.world.store(Owner).get(id)
        if (owner === undefined) {
          return
        }
        launchProjectile(state, {
          sourceId: id,
          targetId: target.id,
          owner: owner.owner,
          kind: projectile.kind,
          damage
        })
      }
      state.world.store(Combat).set(id, { ...combat, cooldownRemaining: combat.cooldownTicks })
    }
    return
  }
  if (front.type === 'ATTACK') {
    setMovementDestination(state, id, target.position.x, target.position.y)
  } else if (front.type === 'ATTACK_MOVE') {
    setMovementDestination(state, id, front.x, front.y)
  }
}

function processCombatUnit(state: GameState, index: ReturnType<typeof createWorldSpatialIndex>, id: EntityId): void {
  const combat = state.world.store(Combat).get(id)
  if (combat === undefined || !unitCanAttack(state.world.store(Kind).get(id))) {
    return
  }
  const position = state.world.store(Position).get(id)
  const owner = state.world.store(Owner).get(id)
  if (position === undefined || owner === undefined) {
    return
  }
  const cooldownRemaining = Math.max(0, combat.cooldownRemaining - 1)
  state.world.store(Combat).set(id, { ...combat, cooldownRemaining })
  const front = state.world.store(Orders).get(id)?.queue[0]
  if (front === undefined) {
    return
  }
  const target = resolveTarget({
    state,
    id,
    front,
    position,
    ownerId: owner.owner,
    rangeFixed: combat.rangeTiles * FIXED_SCALE,
    index
  })
  if (target === null) {
    if (front.type === 'ATTACK_MOVE' && state.world.store(AttackTarget).get(id)?.lostVision !== true) {
      setMovementDestination(state, id, front.x, front.y)
    }
    return
  }
  applyCombatTarget({ state, id, front, position, target, combat, cooldownRemaining })
}

/**
 * Combat step 13 (master plan P1.05): resolves each combat unit's attack
 * intent for the tick. ATTACK orders chase and fire at their target;
 * HOLD and ATTACK_MOVE auto-acquire the nearest enemy in range. Fired damage
 * is accumulated in the per-tick buffer instead of applying immediately, so
 * death resolution (step 14) sees the full tick's simultaneous damage.
 * Emits `attackFired` for every attack performed.
 */
export function combatSystem(state: GameState): void {
  advanceProjectiles(state)
  const index = createWorldSpatialIndex(state)
  for (const id of state.world.query(Combat)) {
    processCombatUnit(state, index, id)
  }
}
