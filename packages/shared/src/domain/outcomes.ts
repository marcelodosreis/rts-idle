/** Closed match outcome registry, shared by the server, protocol, and UI. */
export const MATCH_RESULTS = ['victory', 'defeat', 'draw'] as const

export type MatchResult = (typeof MATCH_RESULTS)[number]
