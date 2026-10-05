import { describe, expect, it } from 'vitest'
import { isMatchEntryState, matchEntryState } from '../../../apps/web/src/shared/transport/match-entry-state'

describe('match entry state', () => {
  it('creates the marker used by Home navigation', () => {
    expect(isMatchEntryState(matchEntryState())).toBe(true)
  })

  it('rejects direct, stale, and malformed route state', () => {
    expect(isMatchEntryState(null)).toBe(false)
    expect(isMatchEntryState({})).toBe(false)
    expect(isMatchEntryState({ source: 'direct' })).toBe(false)
    expect(isMatchEntryState({ source: 1 })).toBe(false)
  })
})
