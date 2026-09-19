import type { UnitKind } from './types.js'

export type FallbackShape = 'circle' | 'square' | 'triangle'

export interface FallbackGlyph {
  readonly letter: string
  readonly shape: FallbackShape
}

export const FALLBACK_GLYPH: Readonly<Record<UnitKind, FallbackGlyph>> = {
  pawn: { letter: 'P', shape: 'circle' },
  warrior: { letter: 'W', shape: 'square' },
  archer: { letter: 'A', shape: 'triangle' }
}
