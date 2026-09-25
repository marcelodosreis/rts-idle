/** Average of a numeric sample set. */
export function average(values: readonly number[]): number {
  return values.reduce((acc, value) => acc + value, 0) / values.length
}

export { percentile } from '@rts/shared'
