/**
 * Pure coordinate math for the level editor's single-hit canvas. The editor
 * converts one pointer event into a grid cell instead of building a hit
 * `Graphics` per cell, so this stays presentation-only and easy to test.
 */

export interface Cell {
  readonly x: number
  readonly y: number
}

/**
 * Converts a position local to the grid container into a cell, or `null` when
 * it falls outside the `size`×`size` grid.
 */
export function cellFromLocal(localX: number, localY: number, size: number, tile: number): Cell | null {
  if (localX < 0 || localY < 0) {
    return null
  }
  const x = Math.floor(localX / tile)
  const y = Math.floor(localY / tile)
  if (x >= size || y >= size) {
    return null
  }
  return { x, y }
}
