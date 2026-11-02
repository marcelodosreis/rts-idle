import { type Application, Graphics } from 'pixi.js'

/** Screen-space rectangle used by the renderer's selection-box presentation. */
export function createSelectionRect(app: Application): Graphics {
  const selectionRect = new Graphics()
  selectionRect.visible = false
  selectionRect.eventMode = 'none'
  app.stage.addChild(selectionRect)
  return selectionRect
}
