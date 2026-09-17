export const FIXED_SCALE = 256

export const ONE_TILE = FIXED_SCALE

export type Fixed = number

export function tilesToFixed(tiles: number): Fixed {
  if (!Number.isFinite(tiles)) {
    throw new Error(`tilesToFixed: non-finite value ${tiles}`)
  }
  const exact = tiles * FIXED_SCALE
  if (!Number.isInteger(exact)) {
    throw new Error(
      `tilesToFixed: ${tiles} is not representable as an integer number of fixed units (scale ${FIXED_SCALE})`
    )
  }
  return exact
}

export function fixedToTiles(fixed: Fixed): number {
  return fixed / FIXED_SCALE
}

export function distSquaredFixed(ax: Fixed, ay: Fixed, bx: Fixed, by: Fixed): number {
  const dx = bx - ax
  const dy = by - ay
  return dx * dx + dy * dy
}

export function intSqrt(n: number): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`intSqrt: expected a non-negative integer, got ${n}`)
  }
  if (n === 0) {
    return 0
  }
  let root = Math.floor(Math.sqrt(n))
  while ((root + 1) * (root + 1) <= n) {
    root += 1
  }
  while (root * root > n) {
    root -= 1
  }
  return root
}
