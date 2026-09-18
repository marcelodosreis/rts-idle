/** Width and height of the overhead health bar in render pixels. */
export const HP_BAR_WIDTH = 36
export const HP_BAR_HEIGHT = 4

/** Health as a clamped 0..1 ratio. */
export function hpRatio(current: number, max: number): number {
  return Math.max(0, Math.min(1, current / max))
}

/**
 * Health-bar color by remaining ratio (green → yellow → red). Thresholds are
 * a presentation convention, never a gameplay decision.
 */
export function hpColor(ratio: number): number {
  if (ratio > 0.5) {
    return 0x4caf50
  }
  if (ratio > 0.25) {
    return 0xffc107
  }
  return 0xf44336
}

/** Fill width in render pixels for a ratio on a bar of the given width. */
export function hpFillWidth(ratio: number, width: number): number {
  return Math.round(width * ratio)
}
