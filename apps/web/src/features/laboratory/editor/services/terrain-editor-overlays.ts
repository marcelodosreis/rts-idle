import type { Container, Graphics } from 'pixi.js'
import { type Cell, cellFromLocal } from '../lib/terrain-geometry'
import { GRID_PX, type MatrixMode, SIZE, TILE } from '../types/terrain-editor-data'

/** Draws the 32×32 editor grid lines. */
export function drawEditorGrid(gridGraphics: Graphics): void {
  gridGraphics.clear()
  for (let index = 0; index <= SIZE; index += 1) {
    const point = index * TILE
    gridGraphics.moveTo(point, 0).lineTo(point, GRID_PX)
    gridGraphics.moveTo(0, point).lineTo(GRID_PX, point)
  }
  gridGraphics.stroke({ width: 1, color: 0xffffff, alpha: 0.18 })
}

export function updateGridVisibility(gridGraphics: Graphics, matrixKind: MatrixMode | null, showGrid: boolean): void {
  gridGraphics.visible = matrixKind === null && showGrid
}

/** Draws the hovered-cell highlight (hidden while the matrix overlay is open). */
export function updateHighlight(highlightGraphics: Graphics, cell: Cell | null, matrixKind: MatrixMode | null): void {
  highlightGraphics.clear()
  if (cell === null || matrixKind !== null) {
    return
  }
  highlightGraphics
    .rect(cell.x * TILE, cell.y * TILE, TILE, TILE)
    .fill({ color: 0xffffff, alpha: 0.08 })
    .stroke({ width: 2, color: 0xffffff, alpha: 0.9 })
}

export interface EditorPointerHandlers {
  readonly isMatrixOpen: () => boolean
  readonly onCell: (cell: Cell | null) => void
  readonly onReadoutCell: (x: number, y: number) => void
  readonly onPaint: (x: number, y: number) => void
}

function cellFromEvent(
  event: { getLocalPosition: (target: Container) => { x: number; y: number } },
  worldContainer: Container
): Cell | null {
  const local = event.getLocalPosition(worldContainer)
  return cellFromLocal(local.x, local.y, SIZE, TILE)
}

/** Wires pointer move/out/down on the invisible hit plane. */
export function bindEditorPointer(
  hitPlane: Graphics,
  worldContainer: Container,
  handlers: EditorPointerHandlers
): void {
  hitPlane.on('pointermove', (event: { getLocalPosition: (target: Container) => { x: number; y: number } }) => {
    const cell = cellFromEvent(event, worldContainer)
    handlers.onCell(cell)
    if (cell !== null) {
      handlers.onReadoutCell(cell.x, cell.y)
    }
  })
  hitPlane.on('pointerout', () => handlers.onCell(null))
  hitPlane.on('pointerdown', (event: { getLocalPosition: (target: Container) => { x: number; y: number } }) => {
    if (handlers.isMatrixOpen()) {
      return
    }
    const cell = cellFromEvent(event, worldContainer)
    if (cell !== null) {
      handlers.onPaint(cell.x, cell.y)
    }
  })
}
