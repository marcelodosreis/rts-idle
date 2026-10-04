import type { StoredMatchSession } from '../../../shared/transport/resume-token'
import type { MatchQueryState } from '../lib/match-query'

export type MatchLaunch =
  | { readonly kind: 'new'; readonly query: MatchQueryState }
  | { readonly kind: 'resume'; readonly session: StoredMatchSession }
