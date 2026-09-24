import { Container, Graphics } from 'pixi.js'
import { describe, expect, it } from 'vitest'
import { RENDER_LAYER_ORDER, RenderLayers } from '../../packages/renderer/src/render-layers.js'

describe('RenderLayers', () => {
  it('mounts persistent containers in the declared visual order', () => {
    const viewport = new Container()
    const layers = new RenderLayers(viewport)

    expect(viewport.children).toEqual([
      layers.terrain,
      layers.worldObjects,
      layers.units,
      layers.selection,
      layers.effects,
      layers.interaction,
      layers.debug
    ])
    expect(viewport.children.map((child) => child.label)).toEqual(RENDER_LAYER_ORDER)
  })

  it('keeps new world objects below units regardless of insertion time', () => {
    const viewport = new Container()
    const layers = new RenderLayers(viewport)
    const initialBuilding = new Graphics()
    const unit = new Graphics()
    const newBuilding = new Graphics()

    layers.worldObjects.addChild(initialBuilding)
    layers.units.addChild(unit)
    layers.worldObjects.addChild(newBuilding)

    expect(viewport.getChildIndex(layers.worldObjects)).toBeLessThan(viewport.getChildIndex(layers.units))
    expect(layers.worldObjects.children).toEqual([initialBuilding, newBuilding])
  })
})
