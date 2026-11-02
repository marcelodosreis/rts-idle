import { type Application, Graphics } from 'pixi.js'
import { FOG_COLOR, UNKNOWN_ALPHA } from './layer.js'

export interface FogBackdrop {
  readonly dispose: () => void
}

/**
 * Screen-space fog behind the world. It only shows when the camera exposes
 * area outside the map (for example during a transient zoom step), so the
 * unfogged renderer clear color never becomes visible.
 */
export function createFogBackdrop(app: Application): FogBackdrop {
  const graphics = new Graphics()
  graphics.eventMode = 'none'
  graphics.alpha = UNKNOWN_ALPHA
  const draw = (): void => {
    graphics.clear()
    graphics.rect(0, 0, app.screen.width, app.screen.height).fill(FOG_COLOR)
  }
  draw()
  app.stage.addChildAt(graphics, 0)
  const onResize = (): void => draw()
  app.renderer.on('resize', onResize)
  return {
    dispose: () => {
      app.renderer.off('resize', onResize)
      graphics.destroy()
    }
  }
}
