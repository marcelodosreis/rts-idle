import { field, isRecord } from '@rts/shared'

export interface MatchReleaseRequest {
  readonly type: 'match_release'
  readonly resumeToken: string
}

export interface MatchReleaseResult {
  readonly type: 'match_release_result'
  readonly released: boolean
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function isMatchReleaseRequest(value: unknown): value is MatchReleaseRequest {
  return isRecord(value) && field(value, 'type') === 'match_release' && isNonEmptyString(field(value, 'resumeToken'))
}

export function isMatchReleaseResult(value: unknown): value is MatchReleaseResult {
  return (
    isRecord(value) && field(value, 'type') === 'match_release_result' && typeof field(value, 'released') === 'boolean'
  )
}
