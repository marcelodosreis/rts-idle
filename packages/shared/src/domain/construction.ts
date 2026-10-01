import { partialResourceRefund, type ResourceCost } from './resources.js'

/**
 * Partial resource refund for cancelling a construction. Uses integer
 * arithmetic with an explicit denominator so the simulation and the HUD derive
 * the same deterministic value:
 *
 *   refund = floor(cost * (totalTicks - progressTicks) * 3 / (totalTicks * 4))
 *
 * A not-yet-started foundation (progress 0) refunds 75% of the cost; a
 * completed building refunds 0. Callers must pass a positive `totalTicks`.
 */
export function constructionRefund(cost: ResourceCost, progressTicks: number, totalTicks: number): ResourceCost {
  const remaining = Math.max(0, totalTicks - progressTicks)
  return partialResourceRefund(cost, remaining, totalTicks)
}
