import { field, isRecord } from '@rts/shared'
import { isScenarioSummary, type ScenarioSummary } from './match.js'

/** Server → client failure notice (transport or command-level). */
export interface ErrorMessage {
  readonly type: 'error'
  readonly message: string
  /** Server catalog supplied when a match cannot be bootstrapped. */
  readonly scenarios?: readonly ScenarioSummary[]
}

/** Type guard for untrusted wire input; the client ignores non-conforming messages. */
export function isErrorMessage(value: unknown): value is ErrorMessage {
  if (!isRecord(value)) {
    return false
  }
  const scenarios = field(value, 'scenarios')
  return (
    field(value, 'type') === 'error' &&
    typeof field(value, 'message') === 'string' &&
    (scenarios === undefined || (Array.isArray(scenarios) && scenarios.every(isScenarioSummary)))
  )
}
