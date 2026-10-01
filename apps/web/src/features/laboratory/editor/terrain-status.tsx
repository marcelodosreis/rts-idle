import { type ReactNode, useCallback, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/shared/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Switch } from '@/shared/ui/switch'
import {
  DRESSING_KIND_OPTIONS,
  type MatrixMode,
  PALETTES,
  type TerrainController,
  type TerrainState
} from './terrain-controller.js'
import type { Cell } from './terrain-geometry.js'
import { ALL_BRUSHES } from './terrain-view-parts.js'

const MATRIX_MODES: readonly { readonly value: MatrixMode; readonly label: string }[] = [
  { value: 'flat', label: 'Flat 16-mask' },
  { value: 'elevated', label: 'Elevated 16-mask' },
  { value: 'cliff', label: 'Cliff-base' }
]

function isMatrixMode(value: string): value is MatrixMode {
  return MATRIX_MODES.some((mode) => mode.value === value)
}

export function StatusBar({
  state,
  readout,
  cursor,
  onPatch
}: {
  readonly state: TerrainState
  readonly readout: string
  readonly cursor: Cell | null
  readonly onPatch: (patch: Partial<TerrainState>) => void
}) {
  const activeBrush = ALL_BRUSHES.find((brush) => brush.value === state.paint)
  const activeDeco =
    state.paint === 'decor' && state.selectedDecoKind !== null
      ? DRESSING_KIND_OPTIONS.find((deco) => deco.kind === state.selectedDecoKind)
      : undefined
  const toolLabel = activeDeco !== undefined ? `${activeDeco.label} v${state.selectedVariant}` : activeBrush?.label

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border/50 bg-card px-3 py-1.5 text-[11px]">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Tool:</span>
        <span className="font-medium text-foreground">
          {activeBrush?.icon} {toolLabel}
        </span>
      </div>
      <div className="h-3 w-px bg-border/50" />
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Palette:</span>
        <Select value={state.palette} onValueChange={(value) => onPatch({ palette: value })}>
          <SelectTrigger className="h-6 w-[70px] border-0 bg-transparent p-0 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PALETTES.map((palette) => (
              <SelectItem key={palette} value={palette}>
                {palette}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="h-3 w-px bg-border/50" />
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Overlay:</span>
        <Select
          value={state.matrixKind ?? 'off'}
          onValueChange={(value) => onPatch({ matrixKind: isMatrixMode(value) ? value : null })}
        >
          <SelectTrigger className="h-6 w-[80px] border-0 bg-transparent p-0 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">Off</SelectItem>
            {MATRIX_MODES.map((mode) => (
              <SelectItem key={mode.value} value={mode.value}>
                {mode.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {state.matrixKind !== null && (
        <>
          <div className="h-3 w-px bg-border/50" />
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Matrix:</span>
            <span className="font-medium text-foreground">{state.matrixKind}</span>
          </div>
        </>
      )}
      <div className="h-3 w-px bg-border/50" />
      {/* biome-ignore lint/a11y/noLabelWithoutControl: the control (Switch) is nested */}
      <label className="flex items-center gap-1.5 text-muted-foreground">
        Grid
        <Switch
          checked={state.showGrid}
          onCheckedChange={(checked) => onPatch({ showGrid: checked })}
          aria-label="toggle cell grid"
        />
      </label>
      <div className="h-3 w-px bg-border/50" />
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Cell:</span>
        <span className="font-mono text-foreground" data-testid="cursor-cell">
          {cursor === null ? '—' : `${cursor.x}, ${cursor.y}`}
        </span>
      </div>
      <div className="flex-1" />
      <span className="max-w-[300px] truncate text-muted-foreground/70">{readout}</span>
    </div>
  )
}

function levelDataJson(controller: TerrainController, format: 'lab' | 'game'): string {
  return format === 'game' ? JSON.stringify(controller.exportMapDefinition()) : JSON.stringify(controller.exportLevel())
}

export function LevelModal({
  mode,
  controller,
  onClose,
  onImport
}: {
  readonly mode: 'export' | 'import'
  readonly controller: TerrainController | null
  readonly onClose: () => void
  readonly onImport: (text: string) => void
}) {
  const [format, setFormat] = useState<'lab' | 'game'>('lab')
  const [text, setText] = useState<string>(() =>
    mode === 'export' && controller !== null ? levelDataJson(controller, 'lab') : ''
  )

  const switchFormat = (next: 'lab' | 'game'): void => {
    setFormat(next)
    if (mode === 'export' && controller !== null) {
      setText(levelDataJson(controller, next))
    }
  }

  const handleCopy = useCallback(async (): Promise<void> => {
    await navigator.clipboard.writeText(text)
    onClose()
  }, [text, onClose])

  const handleImport = useCallback((): void => {
    onImport(text)
    onClose()
  }, [text, onImport, onClose])

  const formatButton = (value: 'lab' | 'game', label: string): ReactNode => (
    <button
      type="button"
      className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
        format === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
      }`}
      onClick={() => switchFormat(value)}
    >
      {label}
    </button>
  )

  return (
    <AlertDialog open={true} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{mode === 'export' ? 'Copy Level' : 'Paste Level'}</AlertDialogTitle>
          <AlertDialogDescription>
            {mode === 'export'
              ? 'Copy the current level data to your clipboard.'
              : 'Paste level data to load it into the editor.'}
          </AlertDialogDescription>
          <div className="flex w-fit gap-1 rounded-lg bg-muted/50 p-0.5">
            {formatButton('lab', 'Lab')}
            {formatButton('game', 'Game')}
          </div>
        </AlertDialogHeader>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          readOnly={mode === 'export'}
          className="h-[200px] w-full resize-none rounded-lg border border-border/50 bg-muted/30 p-3 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder={mode === 'import' ? 'Paste level JSON here…' : ''}
        />
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          {mode === 'export' ? (
            <AlertDialogAction onClick={handleCopy}>Copy to Clipboard</AlertDialogAction>
          ) : (
            <AlertDialogAction onClick={handleImport} disabled={!text.trim()}>
              Load Level
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
