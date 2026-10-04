import type { MatchRequest } from '@rts/protocol'
import { PROTOCOL_VERSION } from '@rts/protocol'
import { describe, expect, it, vi } from 'vitest'
import {
  clearMatchResumeState,
  readStoredMatchSession,
  type StoredMatchSession,
  saveMatchSession
} from '../../../apps/web/src/shared/transport/resume-token'

const request: Omit<MatchRequest, 'resumeToken'> = {
  type: 'match_request',
  protocolVersion: PROTOCOL_VERSION,
  scenarioId: 'regression',
  aggression: 'passive',
  map: { source: 'catalog' }
}

const stored: StoredMatchSession = {
  version: 1,
  resumeToken: 'resume-token',
  request,
  spritesEnabled: false
}

describe('stored match session', () => {
  it('round-trips the resume token and original request', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    })

    saveMatchSession(stored)

    expect(readStoredMatchSession()).toEqual(stored)
    vi.unstubAllGlobals()
  })

  it('fails closed for malformed or legacy storage', () => {
    const values = new Map<string, string>([['rts-idle.match-session', '{"version":1}']])
    const removeItem = vi.fn((key: string) => values.delete(key))
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: vi.fn(),
      removeItem
    })

    expect(readStoredMatchSession()).toBeNull()
    clearMatchResumeState()

    expect(removeItem).toHaveBeenCalledWith('rts-idle.match-session')
    expect(removeItem).toHaveBeenCalledWith('rts-idle.resume-token')
    vi.unstubAllGlobals()
  })
})
