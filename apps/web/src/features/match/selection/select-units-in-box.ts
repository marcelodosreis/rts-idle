export interface SelectionPoint {
  readonly x: number
  readonly y: number
}

export function selectUnitsInBox(
  positions: ReadonlyMap<number, SelectionPoint>,
  from: SelectionPoint,
  to: SelectionPoint
): readonly number[] {
  const left = Math.min(from.x, to.x)
  const right = Math.max(from.x, to.x)
  const top = Math.min(from.y, to.y)
  const bottom = Math.max(from.y, to.y)
  const selected: number[] = []
  for (const [id, position] of positions) {
    if (position.x >= left && position.x <= right && position.y >= top && position.y <= bottom) {
      selected.push(id)
    }
  }
  return selected.sort((a, b) => a - b)
}
