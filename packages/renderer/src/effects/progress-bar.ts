import type { Graphics } from 'pixi.js'

/** Standard bar dimensions and styling used by all canvas progress bars. */
export const BAR_WIDTH = 44
export const BAR_HEIGHT = 6
export const BAR_RADIUS = 2
export const BAR_BACKGROUND = { color: 0x111827, alpha: 0.8 } as const
export const BAR_BORDER = { color: 0x0f172a, width: 2 } as const

export interface ProgressBarBackground {
  readonly color: number
  readonly alpha: number
}

export interface ProgressBarBorder {
  readonly color: number
  readonly width: number
}

export interface ProgressBarOptions {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height?: number
  readonly ratio: number
  readonly fillColor: number
  readonly background?: ProgressBarBackground | null
  readonly border?: ProgressBarBorder | null
  readonly radius?: number
}

/** Health as a clamped 0..1 ratio. */
export function clampRatio(value: number, max: number): number {
  if (max <= 0) {
    return 0
  }
  return Math.max(0, Math.min(1, value / max))
}

/** Fill width in render pixels for a ratio on a bar of the given width. */
export function barFillWidth(ratio: number, width: number): number {
  return Math.round(width * ratio)
}

/**
 * Health-bar color by remaining ratio (green -> yellow -> red). Thresholds are
 * a presentation convention, never a gameplay decision.
 */
export function hpColor(ratio: number): number {
  if (ratio > 0.5) {
    return 0x22c55e
  }
  if (ratio > 0.25) {
    return 0xffc107
  }
  return 0xf44336
}

/**
 * Draws a progress bar with uniform visual treatment (background, fill, border,
 * rounded corners). Callers must call `graphics.clear()` beforehand and manage
 * `graphics.visible` themselves.
 */
export function drawProgressBar(graphics: Graphics, options: ProgressBarOptions): void {
  const {
    x,
    y,
    width,
    height = BAR_HEIGHT,
    ratio,
    fillColor,
    background = BAR_BACKGROUND,
    border = BAR_BORDER,
    radius = BAR_RADIUS
  } = options
  const clamped = clampRatio(ratio, 1)
  const fill = barFillWidth(clamped, width)
  if (background !== null && background !== undefined) {
    const bgRadius = Math.min(radius, height / 2)
    graphics.roundRect(x, y, width, height, bgRadius).fill({ color: background.color, alpha: background.alpha })
  }
  if (fill > 0) {
    const fillRadius = Math.min(radius, fill / 2, height / 2)
    graphics.roundRect(x, y, fill, height, fillRadius).fill({ color: fillColor })
  }
  if (border !== null && border !== undefined) {
    const borderRadius = Math.min(radius, height / 2)
    graphics.roundRect(x, y, width, height, borderRadius).stroke({ color: border.color, width: border.width })
  }
}
