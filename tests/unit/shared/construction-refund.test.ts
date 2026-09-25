import { constructionRefund } from '@rts/shared'
import { describe, expect, it } from 'vitest'

describe('constructionRefund (P2.05)', () => {
  it('refunds 75% of the cost for an untouched foundation', () => {
    expect(constructionRefund(100, 0, 100)).toBe(75)
    expect(constructionRefund(150, 0, 100)).toBe(112)
    expect(constructionRefund(100, 0, 100)).toBe(75)
  })

  it('refunds the remaining portion proportionally, rounded down', () => {
    expect(constructionRefund(100, 50, 100)).toBe(37)
    expect(constructionRefund(100, 25, 100)).toBe(56)
    expect(constructionRefund(150, 50, 100)).toBe(56)
  })

  it('refunds nothing at completion and floors small remainders', () => {
    expect(constructionRefund(100, 100, 100)).toBe(0)
    expect(constructionRefund(100, 99, 100)).toBe(0)
    expect(constructionRefund(100, 98, 100)).toBe(1)
  })

  it('uses integer arithmetic for the explicit denominator', () => {
    expect(constructionRefund(1, 0, 3)).toBe(0)
    expect(constructionRefund(7, 1, 4)).toBe(3)
  })
})
