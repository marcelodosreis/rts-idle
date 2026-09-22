import type { Application } from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import type { CameraInputOptions, InputProfile, WorldPoint } from './input-types.js'

export interface CameraController {
  readonly viewport: Viewport
  readonly setProfile: (profile: InputProfile) => void
  readonly dispose: () => void
}

function wheelOptions(profile: InputProfile) {
  return {
    trackpadPinch: true,
    wheelZoom: profile === 'mouse'
  } as const
}

/** Shared camera setup for the game and the renderer tools. */
export function createCameraController(
  app: Application,
  options: {
    readonly worldWidth: number
    readonly worldHeight: number
    readonly initialCenter: WorldPoint
    readonly initialZoom: number
    readonly input: CameraInputOptions
  }
): CameraController {
  const viewport = new Viewport({
    screenWidth: app.screen.width,
    screenHeight: app.screen.height,
    worldWidth: options.worldWidth,
    worldHeight: options.worldHeight,
    events: app.renderer.events,
    passiveWheel: false
  })
  app.canvas.style.touchAction = 'none'
  app.canvas.style.overscrollBehavior = 'contain'
  app.stage.addChild(viewport)
  viewport
    .drag({ mouseButtons: 'middle' })
    .pinch()
    .wheel(wheelOptions(options.input.profile))
    .clampZoom({ minScale: options.input.minZoom, maxScale: options.input.maxZoom })
  viewport.setZoom(options.initialZoom)
  viewport.moveCenter(options.initialCenter.x, options.initialCenter.y)

  let profile = options.input.profile

  return {
    viewport,
    setProfile: (nextProfile) => {
      if (profile === nextProfile) {
        return
      }
      viewport.plugins.remove('wheel')
      viewport.wheel(wheelOptions(nextProfile))
      profile = nextProfile
    },
    dispose: () => {
      viewport.plugins.remove('drag')
      viewport.plugins.remove('pinch')
      viewport.plugins.remove('wheel')
    }
  }
}
