import { MAX_UNITS_PER_COMMAND } from '../commands/limits.js'

export interface FormationOffset {
  readonly dx: number
  readonly dy: number
}

export const FORMATION_SPACING = 128

/**
 * Builds the deterministic formation spiral: unit 0 lands on the target and
 * each following ring is walked clockwise (right column, top row, left column,
 * bottom row). Ring order is fixed, so the same index always yields the same
 * offset regardless of call site (deterministic group movement).
 */
function buildSpiral(count: number): readonly FormationOffset[] {
  const offsets: FormationOffset[] = [{ dx: 0, dy: 0 }]
  let ring = 1
  while (offsets.length < count) {
    const push = (x: number, y: number): void => {
      offsets.push({ dx: x, dy: y })
    }
    for (let y = -(ring - 1); y <= ring; y += 1) {
      push(ring, y)
    }
    for (let x = ring - 1; x >= -ring; x -= 1) {
      push(x, ring)
    }
    for (let y = ring - 1; y >= -ring; y -= 1) {
      push(-ring, y)
    }
    for (let x = -ring + 1; x <= ring; x += 1) {
      push(x, -ring)
    }
    ring += 1
  }
  return offsets.slice(0, count)
}

const SPIRAL = buildSpiral(MAX_UNITS_PER_COMMAND)

export function formationOffset(index: number): FormationOffset {
  const offset = SPIRAL[index] ?? { dx: 0, dy: 0 }
  return {
    dx: (offset.dx || 0) * FORMATION_SPACING,
    dy: (offset.dy || 0) * FORMATION_SPACING
  }
}
