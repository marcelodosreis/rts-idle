export interface StepTiming {
  readonly samples: readonly number[]
  readonly heapDeltaMiB: number
}

/**
 * Measures per-step wall-clock cost over `steps` iterations and the heap
 * delta across the whole run (benchmark methodology, master plan §21.5).
 */
export function measureStepTiming(runStep: (tick: number) => void, steps: number): StepTiming {
  const heapBefore = process.memoryUsage().heapUsed
  const samples: number[] = []
  for (let tick = 1; tick <= steps; tick += 1) {
    const start = performance.now()
    runStep(tick)
    samples.push(performance.now() - start)
  }
  return {
    samples,
    heapDeltaMiB: (process.memoryUsage().heapUsed - heapBefore) / (1024 * 1024)
  }
}

/** Average wall-clock cost of `operation` over `samples` runs. */
export function measureAverageMs(operation: () => void, samples: number): number {
  let total = 0
  for (let i = 0; i < samples; i += 1) {
    const start = performance.now()
    operation()
    total += performance.now() - start
  }
  return total / samples
}
