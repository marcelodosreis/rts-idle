import { describe, expect, it } from 'vitest'
import { viewportCoverZoom } from '../../../packages/renderer/src/core/create-camera.js'

describe('viewportCoverZoom', () => {
  it('uses the larger screen-to-world ratio', () => {
    expect(viewportCoverZoom(800, 600, 2048, 2048)).toBeCloseTo(800 / 2048)
    expect(viewportCoverZoom(300, 2000, 2048, 2048)).toBeCloseTo(2000 / 2048)
  })

  it('returns exactly 1 when the world matches the screen', () => {
    expect(viewportCoverZoom(2048, 1024, 2048, 1024)).toBe(1)
  })
})
