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
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const message = value as Record<string, unknown>
  return (
    message.type === 'error' &&
    typeof message.message === 'string' &&
    (message.scenarios === undefined ||
      (Array.isArray(message.scenarios) && message.scenarios.every(isScenarioSummary)))
  )
}
