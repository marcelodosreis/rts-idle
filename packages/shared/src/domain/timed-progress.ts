export interface TimedProgress {
  readonly progressTicks: number
  readonly totalTicks: number
}

export interface TimedProgressResult {
  readonly progressTicks: number
  readonly completed: boolean
}

/** Advances one bounded deterministic tick for a finite activity. */
export function advanceTimedProgress(progress: TimedProgress): TimedProgressResult {
  const progressTicks = Math.min(progress.totalTicks, progress.progressTicks + 1)
  return { progressTicks, completed: progressTicks >= progress.totalTicks }
}
