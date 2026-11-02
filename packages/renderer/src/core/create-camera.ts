import type { Application } from 'pixi.js'
import { createCameraController } from '../input/camera-controller.js'
import type { RendererOptions } from './types.js'

const MIN_ZOOM = 0.05
const MAX_ZOOM = 4

/** Smallest zoom at which the world still covers the whole screen. */
export function viewportCoverZoom(
  screenWidth: number,
  screenHeight: number,
  worldWidth: number,
  worldHeight: number
): number {
  return Math.max(screenWidth / worldWidth, screenHeight / worldHeight)
}

/**
 * Camera for the match and renderer tools. With `clampToWorld`, panning stays
 * inside the map and zoom-out stops at the cover zoom, so the view can never
 * show unfogged space beyond the world.
 */
export function createRendererCamera(
  app: Application,
  options: RendererOptions
): ReturnType<typeof createCameraController> {
  const zoom = options.initialZoom ?? 1
  const center = options.initialCenter ?? { x: options.worldWidth / 2, y: options.worldHeight / 2 }
  const camera = createCameraController(app, {
    worldWidth: options.worldWidth,
    worldHeight: options.worldHeight,
    initialCenter: center,
    initialZoom: zoom,
    input: { profile: options.inputProfile ?? 'mouse', minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM }
  })
  if (options.clampToWorld !== true) {
    return camera
  }
  const { viewport } = camera
  const applyClamp = (): void => {
    const minScale = Math.max(
      MIN_ZOOM,
      viewportCoverZoom(app.screen.width, app.screen.height, options.worldWidth, options.worldHeight)
    )
    viewport.clampZoom({ minScale, maxScale: MAX_ZOOM })
    if (viewport.scale.x < minScale) {
      viewport.setZoom(minScale)
    }
  }
  viewport.clamp({ direction: 'all', underflow: 'center' })
  applyClamp()
  app.renderer.on('resize', applyClamp)
  const dispose = camera.dispose
  return {
    ...camera,
    dispose: () => {
      app.renderer.off('resize', applyClamp)
      dispose()
    }
  }
}
