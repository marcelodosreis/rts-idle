export type CheckStatus = 'pass' | 'fail' | 'warn'

export interface CheckResult {
  readonly label: string
  readonly status: CheckStatus
  readonly detail?: string
}

export type CheckCollector = () => readonly CheckResult[]

const registry = new Map<string, CheckCollector>()

/** Registers a section's check collector for the global "Run all checks". */
export function registerChecks(name: string, collector: CheckCollector): void {
  registry.set(name, collector)
}

export function check(label: string, ok: boolean, detail?: string): CheckResult {
  return detail === undefined
    ? { label, status: ok ? 'pass' : 'fail' }
    : { label, status: ok ? 'pass' : 'fail', detail }
}
