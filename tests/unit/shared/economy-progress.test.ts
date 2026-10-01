import { describe, expect, it } from 'vitest'
import { economyProgressTone } from '../../../packages/shared/src/domain/economy-progress.js'

describe('economy progress tones', () => {
  it('keeps all resource acquisition phases yellow', () => {
    expect(economyProgressTone('to_resource')).toBe('harvesting')
    expect(economyProgressTone('harvesting')).toBe('harvesting')
  })

  it('keeps cargo delivery phases green', () => {
    expect(economyProgressTone('to_base')).toBe('delivery')
    expect(economyProgressTone('waiting_for_base')).toBe('delivery')
  })
})
