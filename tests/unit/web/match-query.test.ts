import { describe, expect, it } from 'vitest'
import { parseMatchQuery, updateMatchQuery } from '../../../apps/web/src/features/match/lib/match-query'

describe('match query state', () => {
  it('normalizes missing and invalid values to safe defaults', () => {
    expect(parseMatchQuery('')).toEqual({ scenario: 'default', aggression: 'passive', spritesEnabled: true })
    expect(parseMatchQuery('?scenario=regression&aggression=unknown&sprites=off')).toEqual({
      scenario: 'regression',
      aggression: 'passive',
      spritesEnabled: false
    })
    expect(parseMatchQuery('?scenario=regression&aggression=offensive').aggression).toBe('offensive')
  })

  it('updates match state without dropping map or unrelated query parameters', () => {
    const search = updateMatchQuery('?map=local&foo=keep', { scenario: 'regression', aggression: 'passive' })
    const params = new URLSearchParams(search)
    expect(params.get('map')).toBe('local')
    expect(params.get('foo')).toBe('keep')
    expect(params.get('scenario')).toBe('regression')
    expect(params.get('aggression')).toBe('passive')
    expect(params.get('sprites')).toBeNull()
  })
})
