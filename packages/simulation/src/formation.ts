export interface FormationOffset {
  readonly dx: number
  readonly dy: number
}

export const FORMATION_SPACING = 128

const MAX_UNITS_PER_COMMAND = 256

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
    dx: offset.dx * FORMATION_SPACING || 0,
    dy: offset.dy * FORMATION_SPACING || 0
  }
}
