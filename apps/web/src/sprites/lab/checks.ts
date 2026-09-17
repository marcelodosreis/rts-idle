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

/** Runs every registered collector and returns section → results. */
export function runAllChecks(): ReadonlyMap<string, readonly CheckResult[]> {
  const out = new Map<string, readonly CheckResult[]>()
  for (const [name, collector] of registry) {
    try {
      out.set(name, collector())
    } catch (error) {
      out.set(name, [
        {
          label: 'check threw',
          status: 'fail',
          detail: error instanceof Error ? error.message : String(error)
        }
      ])
    }
  }
  return out
}

/** Renders check results into a pre-formatted panel. */
export function renderChecks(panel: HTMLElement, results: ReadonlyMap<string, readonly CheckResult[]>): void {
  const lines: string[] = []
  let pass = 0
  let fail = 0
  let warningCount = 0
  for (const [name, checks] of results) {
    for (const result of checks) {
      if (result.status === 'pass') {
        pass += 1
      } else if (result.status === 'fail') {
        fail += 1
      } else {
        warningCount += 1
      }
    }
    if (checks.length > 0) {
      lines.push(
        `${name}: ${checks.map((c) => `${c.status.toUpperCase()} ${c.label}${c.detail ? ` — ${c.detail}` : ''}`).join(' · ')}`
      )
    }
  }
  const summary = `ALL CHECKS  pass ${pass} · fail ${fail} · warn ${warningCount}`
  panel.textContent = `${summary}\n${lines.join('\n')}`
}

export function check(label: string, ok: boolean, detail?: string): CheckResult {
  return detail === undefined
    ? { label, status: ok ? 'pass' : 'fail' }
    : { label, status: ok ? 'pass' : 'fail', detail }
}

export function warn(label: string, detail?: string): CheckResult {
  return detail === undefined ? { label, status: 'warn' } : { label, status: 'warn', detail }
}
