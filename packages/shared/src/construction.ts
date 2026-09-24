/**
 * Partial mineral refund for cancelling a construction (master plan §11.3).
 * Uses integer arithmetic with an explicit denominator so the simulation and
 * the HUD derive the same deterministic value:
 *
 *   refund = floor(costMinerals * (totalTicks - progressTicks) * 3 / (totalTicks * 4))
 *
 * A not-yet-started foundation (progress 0) refunds 75% of the cost; a
 * completed building refunds 0. Callers must pass a positive `totalTicks`.
 */
export function constructionRefund(costMinerals: number, progressTicks: number, totalTicks: number): number {
  const remaining = Math.max(0, totalTicks - progressTicks)
  return Math.floor((costMinerals * remaining * 3) / (totalTicks * 4))
}
