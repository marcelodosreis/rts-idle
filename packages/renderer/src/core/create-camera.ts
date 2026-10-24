import type { Application } from 'pixi.js'
import { createCameraController } from '../input/camera-controller.js'
import type { RendererOptions } from './types.js'

const MIN_ZOOM = 0.05
const MAX_ZOOM = 4

export function createRendererCamera(
  app: Application,
  options: RendererOptions
): ReturnType<typeof createCameraController> {
  const zoom = options.initialZoom ?? 1
  const center = options.initialCenter ?? { x: options.worldWidth / 2, y: options.worldHeight / 2 }
  return createCameraController(app, {
    worldWidth: options.worldWidth,
    worldHeight: options.worldHeight,
    initialCenter: center,
    initialZoom: zoom,
    input: { profile: options.inputProfile ?? 'mouse', minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM }
  })
}
