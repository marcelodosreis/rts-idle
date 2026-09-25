import { Graphics } from 'pixi.js'
import { describe, expect, it } from 'vitest'
import { SelectionController } from '../../../packages/renderer/src/effects/selection.js'

function controller(): SelectionController {
  return new SelectionController({
    selectionLayer: new Graphics(),
    units: {} as never,
    selectionRect: new Graphics()
  })
}

describe('SelectionController box feedback', () => {
  it('shows and updates the rectangle while dragging', () => {
    const selection = controller()

    selection.beginBox({ x: 100, y: 80 })
    expect(selection.getBoxState()).toEqual({ visible: true, x: 100, y: 80, width: 0, height: 0 })

    selection.updateBox({ x: 40, y: 20 })
    expect(selection.getBoxState()).toEqual({ visible: true, x: 40, y: 20, width: 60, height: 60 })
  })

  it('clears the rectangle when the drag finishes or is cancelled', () => {
    const selection = controller()

    selection.beginBox({ x: 0, y: 0 })
    selection.updateBox({ x: 20, y: 30 })
    selection.finishBox()
    expect(selection.getBoxState().visible).toBe(false)

    selection.beginBox({ x: 0, y: 0 })
    selection.cancelBox()
    expect(selection.getBoxState().visible).toBe(false)
  })
})
