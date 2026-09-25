import { cpus } from 'node:os'

export interface BenchmarkEnvironment {
  readonly hardware: string
  readonly platform: string
  readonly nodeVersion: string
}

/** Hardware/platform identity for reproducible benchmark reporting. */
export function describeEnvironment(): BenchmarkEnvironment {
  const cpuList = cpus()
  const model = cpuList[0]?.model ?? 'unknown'
  const cores = cpuList.length
  return {
    hardware: `${model} (${cores} threads)`,
    platform: process.platform,
    nodeVersion: process.version
  }
}
