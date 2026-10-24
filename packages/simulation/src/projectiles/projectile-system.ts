import { projectileDefinitionFor } from '@rts/game-data'
import {
  distSquaredFixed,
  type EntityId,
  FIXED_SCALE,
  type Fixed,
  intSqrt,
  type PlayerId,
  type ProjectileKind
} from '@rts/shared'
import { effectiveArmor } from '../domain/research-effects.js'
import { Health, Position } from '../ecs/components.js'
import type { GameState } from '../state/state.js'
import { TICKS_PER_SECOND } from '../systems/movement-step.js'
import type { ProjectileState, ProjectileStore } from './projectile-state.js'

interface MovementStep {
  readonly distance: number
  readonly remainder: number
}

interface ProjectileTarget {
  readonly alive: boolean
  readonly x: Fixed
  readonly y: Fixed
}

function nextMovementStep(projectile: ProjectileState): MovementStep {
  const definition = projectileDefinitionFor(projectile.kind)
  const numerator = definition.speedTilesPerSecond * FIXED_SCALE + projectile.movementRemainder
  return {
    distance: Math.floor(numerator / TICKS_PER_SECOND),
    remainder: numerator % TICKS_PER_SECOND
  }
}

function targetFor(state: GameState, projectile: ProjectileState): ProjectileTarget {
  const position = state.world.store(Position).get(projectile.targetId)
  const health = state.world.store(Health).get(projectile.targetId)
  if (position === undefined || health === undefined || health.current <= 0) {
    return { alive: false, x: projectile.lastKnownX, y: projectile.lastKnownY }
  }
  return { alive: true, x: position.x, y: position.y }
}

function reachedTarget(projectile: ProjectileState, target: ProjectileTarget, distance: number): boolean {
  return distSquaredFixed(projectile.x, projectile.y, target.x, target.y) <= distance * distance
}

function movedProjectile(
  projectile: ProjectileState,
  target: ProjectileTarget,
  distance: number,
  remainder: number
): ProjectileState {
  const dx = target.x - projectile.x
  const dy = target.y - projectile.y
  const length = intSqrt(distSquaredFixed(projectile.x, projectile.y, target.x, target.y))
  if (length === 0 || distance >= length) {
    return {
      ...projectile,
      x: target.x,
      y: target.y,
      lastKnownX: target.x,
      lastKnownY: target.y,
      movementRemainder: remainder
    }
  }
  return {
    ...projectile,
    x: projectile.x + Math.trunc((dx * distance) / length),
    y: projectile.y + Math.trunc((dy * distance) / length),
    lastKnownX: target.x,
    lastKnownY: target.y,
    movementRemainder: remainder
  }
}

function emitExpired(state: GameState, projectile: ProjectileState, reason: 'TTL' | 'TARGET_DEAD'): void {
  state.events.push({
    type: 'projectileExpired',
    projectileId: projectile.id,
    kind: projectile.kind,
    x: projectile.x,
    y: projectile.y,
    reason
  })
}

function resolveImpact(state: GameState, projectile: ProjectileState): void {
  const damage = Math.max(1, projectile.damage - effectiveArmor(state, projectile.targetId))
  const existing = state.pendingDamage.get(projectile.targetId)
  state.pendingDamage.set(projectile.targetId, {
    amount: (existing?.amount ?? 0) + damage,
    attackerId: projectile.sourceId
  })
  state.events.push({
    type: 'projectileImpacted',
    projectileId: projectile.id,
    kind: projectile.kind,
    x: projectile.x,
    y: projectile.y
  })
}

function advanceOne(state: GameState, store: ProjectileStore, projectile: ProjectileState): void {
  const target = targetFor(state, projectile)
  const step = nextMovementStep(projectile)
  if (!target.alive && reachedTarget(projectile, target, step.distance)) {
    const atTarget = movedProjectile(projectile, target, step.distance, step.remainder)
    store.active.delete(projectile.id)
    emitExpired(state, atTarget, 'TARGET_DEAD')
    return
  }
  if (target.alive && reachedTarget(projectile, target, step.distance)) {
    const atImpact = { ...projectile, x: target.x, y: target.y, lastKnownX: target.x, lastKnownY: target.y }
    store.active.delete(projectile.id)
    resolveImpact(state, atImpact)
    return
  }
  const moved = movedProjectile(projectile, target, step.distance, step.remainder)
  const remainingTtl = moved.remainingTtl - 1
  if (remainingTtl <= 0) {
    store.active.delete(projectile.id)
    emitExpired(state, { ...moved, remainingTtl: 0 }, 'TTL')
    return
  }
  store.active.set(projectile.id, { ...moved, remainingTtl })
}

export function advanceProjectiles(state: GameState): void {
  const projectiles = [...state.projectiles.active.values()].sort((left, right) => left.id - right.id)
  for (const projectile of projectiles) {
    if (state.projectiles.active.has(projectile.id)) {
      advanceOne(state, state.projectiles, projectile)
    }
  }
}

interface ProjectileLaunch {
  readonly sourceId: EntityId
  readonly targetId: EntityId
  readonly owner: PlayerId
  readonly kind: ProjectileKind
  readonly damage: number
}

export function launchProjectile(state: GameState, launch: ProjectileLaunch): void {
  const { sourceId, targetId, owner, kind, damage } = launch
  const sourcePosition = state.world.store(Position).get(sourceId)
  const targetPosition = state.world.store(Position).get(targetId)
  if (sourcePosition === undefined || targetPosition === undefined) {
    return
  }
  const definition = projectileDefinitionFor(kind)
  const id = state.projectiles.nextId
  state.projectiles.nextId += 1
  state.projectiles.active.set(id, {
    id,
    kind,
    owner,
    sourceId,
    targetId,
    x: sourcePosition.x,
    y: sourcePosition.y,
    lastKnownX: targetPosition.x,
    lastKnownY: targetPosition.y,
    damage,
    remainingTtl: definition.ttlTicks,
    movementRemainder: 0
  })
  state.events.push({ type: 'attackFired', attackerId: sourceId, targetId })
  state.events.push({
    type: 'projectileLaunched',
    projectileId: id,
    kind,
    owner,
    x: sourcePosition.x,
    y: sourcePosition.y
  })
}
