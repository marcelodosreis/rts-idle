import type { DressingKind } from '@rts/renderer'
import { useCallback } from 'react'
import { Button } from '@/shared/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import {
  DRESSING_KIND_OPTIONS,
  type PaintMode,
  type TerrainController,
  type TerrainState
} from './terrain-controller.js'

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

const DECO_ICONS: Readonly<Record<DressingKind, string>> = {
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

export const ALL_BRUSHES: readonly BrushDef[] = [...TERRAIN_BRUSHES]

export function BrushButton({
  brush,
  active,
  onClick
}: {
  readonly brush: BrushDef
  readonly active: boolean
  readonly onClick: () => void
}) {
  const content = (
    <button
      type="button"
      className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-1.5 text-[11px] transition-all ${
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border/50 bg-muted/50 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
      }`}
      onClick={onClick}
    >
      <span className="text-sm">{brush.icon}</span>
      <span className="leading-tight">{brush.label}</span>
      {brush.beta === true && (
        <span className="rounded bg-yellow-500/20 px-1 py-px text-[7px] font-semibold text-yellow-600 dark:text-yellow-400">
          WIP
        </span>
      )}
    </button>
  )
  if (brush.shortcut === undefined) {
    return content
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild={true}>{content}</TooltipTrigger>
      <TooltipContent side="right">
        {brush.label} <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">{brush.shortcut}</kbd>
      </TooltipContent>
    </Tooltip>
  )
}

const AVAILABLE_DECO_KINDS: readonly DressingKind[] = DRESSING_KIND_OPTIONS.map((deco) => deco.kind)

function decoButtonClass(available: boolean, isSelected: boolean): string {
  if (isSelected) {
    return 'bg-primary text-primary-foreground shadow-sm'
  }
  return available
    ? 'bg-muted/50 text-muted-foreground hover:bg-muted'
    : 'cursor-not-allowed bg-muted/30 text-muted-foreground/40'
}

export function DecoKindGrid({
  selected,
  onSelect
}: {
  readonly selected: DressingKind | null
  readonly onSelect: (kind: DressingKind) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {DRESSING_KIND_OPTIONS.map((deco) => {
        const available = AVAILABLE_DECO_KINDS.includes(deco.kind)
        return (
          <button
            key={deco.kind}
            type="button"
            disabled={!available}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] transition-all ${decoButtonClass(available, selected === deco.kind)}`}
            onClick={() => {
              if (available) {
                onSelect(deco.kind)
              }
            }}
          >
            <span className="text-sm">{DECO_ICONS[deco.kind]}</span>
            <span className="leading-tight">{deco.label}</span>
            {!available && <span className="text-[7px] text-muted-foreground/50">soon</span>}
          </button>
        )
      })}
    </div>
  )
}

export function VariantPicker({
  kind,
  selectedVariant,
  onSelect
}: {
  readonly kind: DressingKind
  readonly selectedVariant: number
  readonly onSelect: (variant: number) => void
}) {
  const deco = DRESSING_KIND_OPTIONS.find((candidate) => candidate.kind === kind)
  if (deco === undefined) {
    return null
  }
  return (
    <div className="mt-2">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {deco.label} variants
      </div>
      <div className="grid grid-cols-4 gap-1">
        {deco.keys.map((key, index) => (
          <button
            key={key}
            type="button"
            className={`flex h-8 items-center justify-center rounded-md text-[10px] font-medium transition-all ${
              selectedVariant === index
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => onSelect(index)}
          >
            v{index}
          </button>
        ))}
      </div>
    </div>
  )
}

export function HistoryButtons({
  controller,
  onStateChange
}: {
  readonly controller: TerrainController | null
  readonly onStateChange: (patch: Partial<TerrainState>) => void
}) {
  const handleUndo = useCallback((): void => {
    const snap = controller?.undo()
    if (snap !== null && snap !== undefined) {
      onStateChange({})
    }
  }, [controller, onStateChange])

  const handleRedo = useCallback((): void => {
    const snap = controller?.redo()
    if (snap !== null && snap !== undefined) {
      onStateChange({})
    }
  }, [controller, onStateChange])

  return (
    <div className="grid w-full grid-cols-2 gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <Button variant="outline" size="sm" className="h-8 w-full text-[10px]" onClick={handleUndo}>
            <span aria-hidden="true">↶</span>
            Undo
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Undo <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">Ctrl+Z</kbd>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <Button variant="outline" size="sm" className="h-8 w-full text-[10px]" onClick={handleRedo}>
            <span aria-hidden="true">↷</span>
            Redo
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Redo <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">Ctrl+Shift+Z</kbd>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
