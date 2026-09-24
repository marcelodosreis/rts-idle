import { Container } from 'pixi.js'

export const RENDER_LAYER_ORDER = [
  'terrain',
  'worldObjects',
  'units',
  'selection',
  'effects',
  'interaction',
  'debug'
] as const

export type RenderLayerName = (typeof RENDER_LAYER_ORDER)[number]

/** Owns the stable world-space render order for the game viewport. */
export class RenderLayers {
  readonly terrain = new Container()
  readonly worldObjects = new Container()
  readonly units = new Container()
  readonly selection = new Container()
  readonly effects = new Container()
  readonly interaction = new Container()
  readonly debug = new Container()

  constructor(viewport: Container) {
    for (const name of RENDER_LAYER_ORDER) {
      const layer = this[name]
      layer.label = name
      viewport.addChild(layer)
    }
  }
}
