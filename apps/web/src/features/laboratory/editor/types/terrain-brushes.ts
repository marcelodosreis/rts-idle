import type { DressingKind } from '@rts/renderer'
import type { PaintMode } from './terrain-editor-data'

export interface BrushDef {
  readonly value: PaintMode
  readonly label: string
  readonly icon: string
  readonly shortcut?: string
  readonly beta?: boolean
}

export const TERRAIN_BRUSHES: readonly BrushDef[] = [
  { value: 'land', label: 'Grass', icon: '🌿', shortcut: '1' },
  { value: 'water', label: 'Water', icon: '💧', shortcut: '2' },
  { value: 'eraser', label: 'Eraser', icon: '🧹', shortcut: '3' },
  { value: 'elevated', label: 'High', icon: '⛰️', shortcut: '4', beta: true },
  { value: 'left', label: 'Stair ↙', icon: '🪜', beta: true },
  { value: 'right', label: 'Stair ↘', icon: '🪜', beta: true }
]

export const ALL_BRUSHES: readonly BrushDef[] = [...TERRAIN_BRUSHES]

export const DECO_ICONS: Readonly<Record<DressingKind, string>> = {
  bush: '🌿',
  tree: '🌳',
  rock: '🪨',
  cloud: '☁️',
  water_rock: '💎',
  gold: '✨',
  gold_stone: '🪨',
  wood: '🪵',
  meat: '🥩',
  sheep: '🐑'
}
