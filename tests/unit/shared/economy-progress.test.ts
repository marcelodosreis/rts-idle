import { describe, expect, it } from 'vitest'
import { economyProgressTone } from '../../../packages/shared/src/domain/economy-progress.js'

describe('economy progress tones', () => {
  it('keeps all mineral acquisition phases purple', () => {
    expect(economyProgressTone('to_node')).toBe('mining')
    expect(economyProgressTone('gathering')).toBe('mining')
  })

  it('keeps cargo delivery phases green', () => {
    expect(economyProgressTone('to_base')).toBe('delivery')
    expect(economyProgressTone('waiting_for_base')).toBe('delivery')
  })
})
