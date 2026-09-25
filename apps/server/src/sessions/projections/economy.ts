import type { EconomyPhase, SnapshotEconomy } from '@rts/protocol'
import { GATHER_TICKS_PER_MINERAL, MINERAL_CARGO_CAPACITY, type Order } from '@rts/simulation'

export function projectEconomy(
  front: Order | undefined,
  cargo: { readonly amount: number; readonly capacity: number } | undefined
): SnapshotEconomy | undefined {
  if (front?.type !== 'GATHER' || cargo === undefined) {
    return undefined
  }
  const phaseByOrder: Readonly<Record<typeof front.phase, EconomyPhase>> = {
    TO_NODE: 'to_node',
    GATHERING: 'gathering',
    TO_BASE: 'to_base',
    WAITING_FOR_BASE: 'waiting_for_base'
  }
  return {
    phase: phaseByOrder[front.phase],
    cargoAmount: cargo.amount,
    cargoCapacity: cargo.capacity,
    progressTicks: front.progressTicks,
    progressMax: GATHER_TICKS_PER_MINERAL * MINERAL_CARGO_CAPACITY,
    nodeId: front.nodeId
  }
}
