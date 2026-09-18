import type { EntityId, Fixed, PlayerId, SimulationEvent } from '@rts/shared'

/** Unit archetype on the wire; maps to a sprite set (defaults to `pawn`). */
export type UnitKind = 'pawn' | 'warrior' | 'archer'

/** High-level unit behavior for the renderer (drives idle/run/attack). */
export type OrderState = 'idle' | 'moving' | 'attacking' | 'hold' | 'patrol' | 'attack_move'

/** A unit as projected on the wire: position, owner, kind, combat state, order. */
export interface SnapshotUnit {
  readonly id: EntityId
  readonly x: Fixed
  readonly y: Fixed
  readonly owner: PlayerId
  readonly kind?: UnitKind
  readonly hp?: number
  readonly maxHp?: number
  readonly orderState?: OrderState
}

/** A competitive slot as projected on the wire. */
export interface SnapshotPlayer {
  readonly id: PlayerId
  readonly defeated: boolean
  readonly gold: number
}

/** Server → client view of a completed tick. */
export interface SnapshotMessage {
  readonly type: 'snapshot'
  readonly tick: number
  readonly phase: 'RUNNING' | 'FINISHED'
  readonly units: readonly SnapshotUnit[]
  readonly players: readonly SnapshotPlayer[]
  readonly events: readonly SimulationEvent[]
}

const KINDS: readonly string[] = ['pawn', 'warrior', 'archer']
const ORDER_STATES: readonly string[] = ['idle', 'moving', 'attacking', 'hold', 'patrol', 'attack_move']

function isOptionalNonNegativeInteger(value: unknown): boolean {
  if (value === undefined) {
    return true
  }
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isSnapshotUnit(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const unit = value as Record<string, unknown>
  const id = unit.id
  const x = unit.x
  const y = unit.y
  const owner = unit.owner
  if (typeof id !== 'number' || !Number.isInteger(id)) {
    return false
  }
  if (typeof x !== 'number' || !Number.isInteger(x)) {
    return false
  }
  if (typeof y !== 'number' || !Number.isInteger(y)) {
    return false
  }
  if (typeof owner !== 'number' || !Number.isInteger(owner)) {
    return false
  }
  if (owner < 0 || owner > 3) {
    return false
  }
  if (unit.kind !== undefined && !KINDS.includes(String(unit.kind))) {
    return false
  }
  if (!isOptionalNonNegativeInteger(unit.hp) || !isOptionalNonNegativeInteger(unit.maxHp)) {
    return false
  }
  if (unit.orderState !== undefined && !ORDER_STATES.includes(String(unit.orderState))) {
    return false
  }
  return true
}

function isSnapshotPlayer(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const player = value as Record<string, unknown>
  return (
    typeof player.id === 'number' &&
    Number.isInteger(player.id) &&
    player.id >= 0 &&
    player.id <= 3 &&
    typeof player.defeated === 'boolean' &&
    typeof player.gold === 'number' &&
    Number.isInteger(player.gold)
  )
}

function isSimulationEvent(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const event = value as Record<string, unknown>
  const type = event.type
  if (type === 'attackFired') {
    return Number.isInteger(event.attackerId) && Number.isInteger(event.targetId)
  }
  if (type === 'damageDealt') {
    return (
      Number.isInteger(event.targetId) &&
      typeof event.amount === 'number' &&
      Number.isInteger(event.amount) &&
      typeof event.targetHp === 'number' &&
      Number.isInteger(event.targetHp)
    )
  }
  if (type === 'unitDied') {
    return (
      Number.isInteger(event.entityId) &&
      typeof event.owner === 'number' &&
      event.owner >= 0 &&
      event.owner <= 3 &&
      (event.killerId === null || Number.isInteger(event.killerId))
    )
  }
  return false
}

/** Type guard for untrusted wire input; the client ignores non-conforming messages. */
export function isSnapshotMessage(value: unknown): value is SnapshotMessage {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const message = value as Record<string, unknown>
  return (
    message.type === 'snapshot' &&
    Number.isInteger(message.tick) &&
    (message.phase === 'RUNNING' || message.phase === 'FINISHED') &&
    Array.isArray(message.units) &&
    message.units.every(isSnapshotUnit) &&
    Array.isArray(message.players) &&
    message.players.every(isSnapshotPlayer) &&
    Array.isArray(message.events) &&
    message.events.every(isSimulationEvent)
  )
}
