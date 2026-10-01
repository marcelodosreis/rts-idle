const DEFAULT_WORKERS = 1

export function e2eWorkerCount(configuredWorkers: string | undefined): number {
  if (configuredWorkers === undefined) {
    return DEFAULT_WORKERS
  }
  const workers = Number(configuredWorkers)
  if (!Number.isInteger(workers) || workers < 1) {
    throw new Error(`invalid E2E worker count: ${configuredWorkers}`)
  }
  return workers
}
