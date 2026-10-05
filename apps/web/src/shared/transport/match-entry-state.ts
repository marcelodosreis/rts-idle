import { field, isRecord } from '@rts/shared'

const MATCH_ENTRY_SOURCE = 'home' as const

export interface MatchEntryState {
  readonly source: typeof MATCH_ENTRY_SOURCE
}

export function matchEntryState(): MatchEntryState {
  return { source: MATCH_ENTRY_SOURCE }
}

export function isMatchEntryState(value: unknown): value is MatchEntryState {
  return isRecord(value) && field(value, 'source') === MATCH_ENTRY_SOURCE
}
