import { constructionRefund } from '@rts/shared'
import { describe, expect, it } from 'vitest'

describe('constructionRefund (P2.05)', () => {
  it('refunds 75% of the cost for an untouched foundation', () => {
    expect(constructionRefund({ GOLD: 100 }, 0, 100).GOLD).toBe(75)
    expect(constructionRefund({ GOLD: 150 }, 0, 100).GOLD).toBe(112)
    expect(constructionRefund({ GOLD: 100 }, 0, 100).GOLD).toBe(75)
  })

  it('refunds the remaining portion proportionally, rounded down', () => {
    expect(constructionRefund({ GOLD: 100 }, 50, 100).GOLD).toBe(37)
    expect(constructionRefund({ GOLD: 100 }, 25, 100).GOLD).toBe(56)
    expect(constructionRefund({ GOLD: 150 }, 50, 100).GOLD).toBe(56)
  })

  it('refunds nothing at completion and floors small remainders', () => {
    expect(constructionRefund({ GOLD: 100 }, 100, 100).GOLD).toBe(0)
    expect(constructionRefund({ GOLD: 100 }, 99, 100).GOLD).toBe(0)
    expect(constructionRefund({ GOLD: 100 }, 98, 100).GOLD).toBe(1)
  })

  it('uses integer arithmetic for the explicit denominator', () => {
    expect(constructionRefund({ GOLD: 1 }, 0, 3).GOLD).toBe(0)
    expect(constructionRefund({ GOLD: 7 }, 1, 4).GOLD).toBe(3)
  })
})
