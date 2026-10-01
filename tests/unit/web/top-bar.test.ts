import { describe, expect, it } from 'vitest'
import { formatMatchTime } from '../../../apps/web/src/features/match/lib/top-bar-display'

describe('formatMatchTime', () => {
  it('formats zero ticks as the start of the match', () => {
    expect(formatMatchTime(0)).toBe('00:00')
  })

  it('converts authoritative ticks into minutes and seconds', () => {
    expect(formatMatchTime(20)).toBe('00:01')
    expect(formatMatchTime(1199)).toBe('00:59')
    expect(formatMatchTime(1200)).toBe('01:00')
  })

  it('keeps minutes growing beyond one hour', () => {
    expect(formatMatchTime(120 * 60 * 20)).toBe('120:00')
  })

  it('clamps invalid negative ticks to zero', () => {
    expect(formatMatchTime(-20)).toBe('00:00')
  })
})
