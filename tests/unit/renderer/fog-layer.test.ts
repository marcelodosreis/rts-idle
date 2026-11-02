import { Container } from 'pixi.js'
import { describe, expect, it } from 'vitest'
import { FogLayer } from '../../../packages/renderer/src/fog/layer.js'

describe('FogLayer', () => {
  it('dims explored tiles and covers unknown tiles while leaving visible tiles clear', () => {
    const container = new Container()
    const layer = new FogLayer(container)

    layer.present({ width: 2, height: 2, visibleTiles: [0], exploredTiles: [0, 1, 2] })

    expect(container.children).toHaveLength(8)
    expect(container.children[0]?.visible).toBe(false)
    expect(container.children[1]?.visible).toBe(true)
    expect(container.children[1]?.alpha).toBeCloseTo(0.46)
    expect(container.children[2]?.alpha).toBeCloseTo(0.46)
    expect(container.children[3]?.alpha).toBeCloseTo(0.88)
    for (const strip of container.children.slice(4)) {
      expect(strip.visible).toBe(true)
      expect(strip.alpha).toBeCloseTo(0.88)
    }
  })

  it('fails closed to unknown tiles when a frame has no fog projection', () => {
    const container = new Container()
    const layer = new FogLayer(container, 1, 1)

    layer.present(undefined)

    expect(container.visible).toBe(true)
    expect(container.children[0]?.visible).toBe(true)
    expect(container.children[0]?.alpha).toBeCloseTo(0.88)
  })
})
