import { describe, expect, it } from 'vitest'
import { parseMatchQuery, updateMatchQuery } from '../../../apps/web/src/features/match/url-state/match-query'

describe('match query state', () => {
  it('normalizes missing and invalid values to safe defaults', () => {
    expect(parseMatchQuery('')).toEqual({ scenario: '6v6', aggression: 'offensive', spritesEnabled: true })
    expect(parseMatchQuery('?scenario=ffa&aggression=unknown&sprites=off')).toEqual({
      scenario: 'ffa',
      aggression: 'offensive',
      spritesEnabled: false
    })
  })

  it('updates match state without dropping map or unrelated query parameters', () => {
    const search = updateMatchQuery('?map=local&foo=keep', { scenario: '4v4', aggression: 'passive' })
    const params = new URLSearchParams(search)
    expect(params.get('map')).toBe('local')
    expect(params.get('foo')).toBe('keep')
    expect(params.get('scenario')).toBe('4v4')
    expect(params.get('aggression')).toBe('passive')
    expect(params.get('sprites')).toBeNull()
  })
})
