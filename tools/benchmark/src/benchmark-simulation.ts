import { describeEnvironment } from './benchmark-environment.js'
import { type BenchmarkRow, measureBenchmarkRow } from './benchmark-row.js'

export interface SimulationBenchmarkResult {
  readonly seed: number
  readonly hardware: string
  readonly platform: string
  readonly nodeVersion: string
  readonly rows: readonly BenchmarkRow[]
}

/** Runs the simulation benchmark across entity counts and assembles the report. */
export function runSimulationBenchmark(
  entityCounts: readonly number[],
  steps: number,
  seed: number
): SimulationBenchmarkResult {
  const environment = describeEnvironment()
  return {
    seed,
    ...environment,
    rows: entityCounts.map((count) => measureBenchmarkRow(count, steps, seed))
  }
}
