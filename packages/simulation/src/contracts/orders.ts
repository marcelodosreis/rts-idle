import type { EntityId, Fixed } from '@rts/shared'

export type GatherPhase = 'TO_NODE' | 'GATHERING' | 'TO_BASE' | 'WAITING_FOR_BASE'

/**
 * A single unit order (master plan P1.03, §15). Orders live in a per-unit
 * queue and are processed by the orders system; movement-intent orders also
 * drive the Movement component. The union is frozen — adding a variant is a
 * deliberate canonical-schema change (regen the golden hash).
 */
export type Order =
  | { readonly type: 'STOP' }
  | { readonly type: 'HOLD' }
  | { readonly type: 'PATROL'; readonly x: Fixed; readonly y: Fixed }
  | { readonly type: 'ATTACK'; readonly targetId: EntityId }
  | { readonly type: 'ATTACK_MOVE'; readonly x: Fixed; readonly y: Fixed }
  | {
      readonly type: 'GATHER'
      readonly nodeId: EntityId
      readonly baseId: EntityId | null
      readonly phase: GatherPhase
      readonly progressTicks: number
    }
