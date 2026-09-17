/**
 * Pure interpolation helpers (presentation only — never gameplay truth).
 * The renderer eases a unit from the previous frame's target to the current
 * one over the observed frame interval, giving a one-tick visual buffer that
 * removes the teleport (master plan §20.3).
 */

/**
 * Blend factor between the previous and current frame targets at wall-clock
 * `now`. Clamped to `[0, 1]`: a negative window (identical timestamps) snaps
 * to the current target. Never extrapolates past the current target.
 */
export function interpolationAlpha(now: number, currentTime: number, previousTime: number): number {
  const window = currentTime - previousTime
  if (window <= 0) {
    return 1
  }
  return Math.min(Math.max((now - currentTime) / window, 0), 1)
}

export interface Point {
  readonly x: number
  readonly y: number
}

/** Linear interpolation between two points at `alpha` (0 = from, 1 = to). */
export function lerpPoint(from: Point, to: Point, alpha: number): Point {
  return {
    x: from.x + (to.x - from.x) * alpha,
    y: from.y + (to.y - from.y) * alpha
  }
}
