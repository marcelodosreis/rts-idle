import type { Fixed } from './fixed.js'
import type { EntityId } from './ids.js'

export interface MovePayload {
  readonly unitIds: readonly EntityId[]
  readonly x: Fixed
  readonly y: Fixed
}

export interface StopPayload {
  readonly unitIds: readonly EntityId[]
}

export interface HoldPayload {
  readonly unitIds: readonly EntityId[]
}

export interface PatrolPayload {
  readonly unitIds: readonly EntityId[]
  readonly x: Fixed
  readonly y: Fixed
}

export interface AttackPayload {
  readonly unitIds: readonly EntityId[]
  readonly targetId: EntityId
}

export interface AttackMovePayload {
  readonly unitIds: readonly EntityId[]
  readonly x: Fixed
  readonly y: Fixed
}

/** SURRENDER has no payload: the issuing player concedes their own match. */
export type SurrenderPayload = Record<string, never>

/**
 * Authoritative command intent (master plan P1.01). Shared by the simulation
 * (executor), the protocol (wire), and the server (transport) so a command is
 * defined once. Payloads only reference shared primitives; scheduling
 * (`tick`/`playerId`/`sequence`) lives in the simulation's `ScheduledCommand`.
 * The union is frozen — adding a variant is a deliberate protocol change.
 */
export type CommandIntent =
  | { readonly type: 'MOVE'; readonly payload: MovePayload }
  | { readonly type: 'STOP'; readonly payload: StopPayload }
  | { readonly type: 'HOLD'; readonly payload: HoldPayload }
  | { readonly type: 'PATROL'; readonly payload: PatrolPayload }
  | { readonly type: 'ATTACK'; readonly payload: AttackPayload }
  | { readonly type: 'ATTACK_MOVE'; readonly payload: AttackMovePayload }
  | { readonly type: 'SURRENDER'; readonly payload: SurrenderPayload }
