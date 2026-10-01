import { autotileTile, cliffBase } from '@rts/renderer'
import { SIZE, type TerrainState } from '../types/terrain-editor-data'
import type { LevelBuffers } from './terrain-editor-level'

export interface PaintViewModel {
  readonly buffers: LevelBuffers
  readonly state: TerrainState
  pushSnapshot(): void
  renderGrid(): void
  readout(text: string): void
  changed(): void
}

export function cellReadout(buffers: LevelBuffers, x: number, y: number): string {
  const stair = buffers.stairs.get(`${x},${y}`)
  const kind = buffers.grid[y]?.[x] ?? 'water'
  const stairNote = stair === undefined ? '' : `  stairs (${stair} ramp bottom)`
  if (kind === 'water') {
    return `cell (${x},${y}) = water${stairNote}`
  }
  const result = autotileTile(buffers.grid, x, y)
  const base = cliffBase(buffers.grid, x, y)
  const baseNote = base === null ? '' : `  cliff base below: #${base}`
  return `cell (${x},${y}) = ${kind}  mask ${result.mask}  piece ${result.semanticId}  atlas #${result.atlasIndex}${stairNote}${baseNote}`
}

function applyPaint(vm: PaintViewModel, x: number, y: number): void {
  const { grid, stairs, decorations } = vm.buffers
  const { paint, selectedDecoKind, selectedVariant } = vm.state
  if (paint === 'eraser') {
    grid[y]![x] = 'water'
    stairs.delete(`${x},${y}`)
    stairs.delete(`${x},${y + 1}`)
    decorations.delete(`${x},${y}`)
    return
  }
  if (paint === 'decor') {
    if (selectedDecoKind !== null) {
      if (decorations.has(`${x},${y}`)) {
        decorations.delete(`${x},${y}`)
      } else {
        decorations.set(`${x},${y}`, { kind: selectedDecoKind, variant: selectedVariant })
      }
    }
    return
  }
  if (paint === 'left' || paint === 'right') {
    stairs.set(`${x},${y}`, paint)
    return
  }
  grid[y]![x] = paint
  stairs.delete(`${x},${y}`)
  stairs.delete(`${x},${y + 1}`)
  decorations.delete(`${x},${y}`)
}

/** Paints one cell; the border is locked water. */
export function paintCell(vm: PaintViewModel, x: number, y: number): void {
  if (x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1) {
    vm.readout(`cell (${x},${y}) is the locked water border — cannot paint`)
    return
  }
  vm.pushSnapshot()
  applyPaint(vm, x, y)
  vm.renderGrid()
  vm.readout(cellReadout(vm.buffers, x, y))
  vm.changed()
}
