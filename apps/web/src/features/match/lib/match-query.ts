export type MatchAggression = 'offensive' | 'passive'

export interface MatchQueryState {
  readonly scenario: string
  readonly aggression: MatchAggression
  readonly spritesEnabled: boolean
}

const DEFAULT_SCENARIO = 'default'
const DEFAULT_AGGRESSION: MatchAggression = 'passive'

function parseAggression(value: string | null): MatchAggression {
  return value === 'offensive' || value === 'passive' ? value : DEFAULT_AGGRESSION
}

export function parseMatchQuery(search: string): MatchQueryState {
  const params = new URLSearchParams(search)
  return {
    scenario: params.get('scenario') ?? DEFAULT_SCENARIO,
    aggression: parseAggression(params.get('aggression')),
    spritesEnabled: params.get('sprites') !== 'off'
  }
}

export function updateMatchQuery(search: string, updates: Partial<MatchQueryState>): string {
  const params = new URLSearchParams(search)
  const current = parseMatchQuery(search)
  const next = { ...current, ...updates }

  params.set('scenario', next.scenario)
  params.set('aggression', next.aggression)
  if (next.spritesEnabled) {
    params.delete('sprites')
  } else {
    params.set('sprites', 'off')
  }
  return params.toString()
}
