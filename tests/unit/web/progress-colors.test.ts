import { describe, expect, it } from 'vitest'
import { PROGRESS_PALETTE } from '../../../packages/renderer/src/effects/progress-palette.js'

describe('progress color tokens', () => {
  it('maps each gameplay progress state to its text and fill family', () => {
    expect(PROGRESS_PALETTE).toEqual({
      mining: { text: '#facc15', fill: '#facc15' },
      construction: { text: '#c084fc', fill: '#c084fc' },
      training: { text: '#22d3ee', fill: '#22d3ee' },
      delivery: { text: '#22c55e', fill: '#22c55e' }
    })
  })
})
