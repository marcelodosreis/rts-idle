import { isMatchRequest, type MatchRequest } from '@rts/protocol'
import { field, isRecord } from '@rts/shared'

const RESUME_TOKEN_KEY = 'rts-idle.resume-token'
const MATCH_SESSION_KEY = 'rts-idle.match-session'
const MATCH_SESSION_VERSION = 1 as const

export interface StoredMatchSession {
  readonly version: typeof MATCH_SESSION_VERSION
  readonly resumeToken: string
  readonly request: Omit<MatchRequest, 'resumeToken'>
  readonly spritesEnabled: boolean
}

function storage(): Storage | null {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage
}

function isStoredMatchSession(value: unknown): value is StoredMatchSession {
  if (!isRecord(value)) {
    return false
  }
  const request = field(value, 'request')
  const resumeToken = field(value, 'resumeToken')
  const spritesEnabled = field(value, 'spritesEnabled')
  return (
    field(value, 'version') === MATCH_SESSION_VERSION &&
    typeof resumeToken === 'string' &&
    resumeToken.length > 0 &&
    isMatchRequest(request) &&
    typeof spritesEnabled === 'boolean'
  )
}

export function readStoredMatchSession(): StoredMatchSession | null {
  const value = storage()?.getItem(MATCH_SESSION_KEY)
  if (value === null || value === undefined) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(value)
    return isStoredMatchSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveMatchSession(session: StoredMatchSession): void {
  const current = storage()
  current?.setItem(MATCH_SESSION_KEY, JSON.stringify(session))
  current?.setItem(RESUME_TOKEN_KEY, session.resumeToken)
}

export function clearMatchResumeState(): void {
  storage()?.removeItem(MATCH_SESSION_KEY)
  storage()?.removeItem(RESUME_TOKEN_KEY)
}

export function clearMatchResumeToken(): void {
  clearMatchResumeState()
}

export function startNewMatch(reload: () => void): void {
  clearMatchResumeState()
  reload()
}
