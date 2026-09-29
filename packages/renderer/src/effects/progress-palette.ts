import type { ProgressTone } from '@rts/shared'

export interface ProgressPaletteEntry {
  readonly text: `#${string}`
  readonly fill: `#${string}`
}

/** Canonical colors consumed by both the HUD and PixiJS progress bars. */
export const PROGRESS_PALETTE = {
  mining: { text: '#facc15', fill: '#facc15' },
  construction: { text: '#c084fc', fill: '#c084fc' },
  training: { text: '#22d3ee', fill: '#22d3ee' },
  delivery: { text: '#22c55e', fill: '#22c55e' }
} as const satisfies Readonly<Record<ProgressTone, ProgressPaletteEntry>>

/** Converts the canonical CSS fill color to PixiJS's numeric color format. */
export function progressFillColor(tone: ProgressTone): number {
  return Number.parseInt(PROGRESS_PALETTE[tone].fill.slice(1), 16)
}
