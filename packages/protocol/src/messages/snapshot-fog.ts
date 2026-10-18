import { field, isNonNegativeInteger, isRecord } from '@rts/shared'

export interface SnapshotFog {
  readonly width: number
  readonly height: number
  readonly visibleTiles: readonly number[]
  readonly exploredTiles: readonly number[]
}

export function isSnapshotFog(value: unknown): value is SnapshotFog {
  if (!isRecord(value)) {
    return false
  }
  const width = field(value, 'width')
  const height = field(value, 'height')
  const visibleTiles = field(value, 'visibleTiles')
  const exploredTiles = field(value, 'exploredTiles')
  if (
    !isNonNegativeInteger(width) ||
    width === 0 ||
    !isNonNegativeInteger(height) ||
    height === 0 ||
    !Array.isArray(visibleTiles) ||
    !Array.isArray(exploredTiles)
  ) {
    return false
  }
  const tileCount = width * height
  return (
    tileIndexesValid(visibleTiles, tileCount) &&
    tileIndexesValid(exploredTiles, tileCount) &&
    visibleTiles.every((index) => exploredTiles.includes(index))
  )
}

function tileIndexesValid(values: readonly unknown[], tileCount: number): boolean {
  return values.every(
    (value, index) => isNonNegativeInteger(value) && value < tileCount && values.indexOf(value) === index
  )
}
