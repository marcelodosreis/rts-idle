/** Average of a numeric sample set. */
export function average(values: readonly number[]): number {
  return values.reduce((acc, value) => acc + value, 0) / values.length
}

/**
 * Approximate percentile of a sorted sample set: the nearest `p`-quantile
 * rank, clamped to the array bounds. An empty set yields 0.
 */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) {
    return 0
  }
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))
  return sorted[index] ?? 0
}
