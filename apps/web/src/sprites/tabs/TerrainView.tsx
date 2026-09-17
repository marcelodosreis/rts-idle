import type { MapDefinition } from '@rts/game-data'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { check, registerChecks } from '../lab/checks.js'
import { useLabContext } from '../lab-context'
import {
  createTerrainController,
  DEFAULT_TERRAIN_STATE,
  type LevelData,
  type MatrixMode,
  PALETTES,
  type PaintMode,
  type TerrainController,
  type TerrainState
} from './terrain-controller.js'

const PAINT_MODES: readonly { readonly value: PaintMode; readonly label: string; readonly icon: string }[] = [
  { value: 'land', label: 'Grass', icon: '🌿' },
  { value: 'water', label: 'Water', icon: '💧' },
  { value: 'elevated', label: 'High', icon: '⛰️' },
  { value: 'left', label: 'Stair ↙', icon: '🪜' },
  { value: 'right', label: 'Stair ↘', icon: '🪜' },
  { value: 'eraser', label: 'Eraser', icon: '🧹' }
]

const MATRIX_MODES: readonly { readonly value: MatrixMode; readonly label: string }[] = [
  { value: 'flat', label: 'Flat 16-mask' },
  { value: 'elevated', label: 'Elevated 16-mask' },
  { value: 'cliff', label: 'Cliff-base' }
]

function ToolButton({
  mode,
  active,
  onClick
}: {
  readonly mode: (typeof PAINT_MODES)[number]
  readonly active: boolean
  readonly onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-xs transition-all ${
        active ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
      }`}
      onClick={onClick}
    >
      <span className="text-base">{mode.icon}</span>
      <span className="leading-tight">{mode.label}</span>
    </button>
  )
}

function StatusBar({ state, readout }: { readonly state: TerrainState; readonly readout: string }) {
  const activeTool = PAINT_MODES.find((m) => m.value === state.paint)
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border/50 bg-card px-3 py-1.5 text-[11px]">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Tool:</span>
        <span className="font-medium text-foreground">
          {activeTool?.icon} {activeTool?.label}
        </span>
      </div>
      <div className="h-3 w-px bg-border/50" />
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Palette:</span>
        <span className="font-medium text-foreground">{state.palette}</span>
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
      <div className="flex-1" />
      <span className="max-w-[300px] truncate text-muted-foreground/70">{readout}</span>
    </div>
  )
}

function levelDataJson(controller: TerrainController, format: 'lab' | 'game'): string {
  if (format === 'game') {
    return JSON.stringify(controller.exportMapDefinition())
  }
  return JSON.stringify(controller.exportLevel())
}

function LevelModal({
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
  const [text, setText] = useState<string>(() => {
    if (mode === 'export') {
      return controller === null ? '' : levelDataJson(controller, 'lab')
    }
    return ''
  })

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="relative w-[500px] rounded-xl border border-border/50 bg-card p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">{mode === 'export' ? '📋 Copy Level' : '📋 Paste Level'}</h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5">
              {formatButton('lab', 'Lab')}
              {formatButton('game', 'Game')}
            </div>
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={mode === 'export'}
          className="h-[200px] w-full resize-none rounded-lg border border-border/50 bg-muted/30 p-3 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder={mode === 'import' ? 'Paste level JSON here…' : ''}
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          {mode === 'export' ? (
            <Button size="sm" onClick={handleCopy}>
              Copy to Clipboard
            </Button>
          ) : (
            <Button size="sm" onClick={handleImport} disabled={!text.trim()}>
              Load Level
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function TerrainView() {
  const ctx = useLabContext()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const controllerRef = useRef<TerrainController | null>(null)
  const [state, setState] = useState<TerrainState>({ ...DEFAULT_TERRAIN_STATE })
  const [readout, setReadout] = useState('Middle-drag to pan · wheel to zoom · select a tool to paint.')
  const [modal, setModal] = useState<{ mode: 'export' | 'import' } | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (host === null) {
      return
    }
    let disposed = false
    void createTerrainController(host, ctx, setReadout).then((controller) => {
      if (disposed) {
        controller.destroy()
        return
      }
      controllerRef.current = controller
    })
    return () => {
      disposed = true
      controllerRef.current?.destroy()
      controllerRef.current = null
    }
  }, [ctx])

  useEffect(() => {
    controllerRef.current?.setState(state)
  }, [state])

  useEffect(() => {
    registerChecks('terrainPlayground', () => {
      return [check('atlas loaded', ctx.art), check('foam frames', true, '16 frames expected')]
    })
  }, [ctx])

  const set = useCallback((patch: Partial<TerrainState>): void => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback((): void => {
    controllerRef.current?.reset()
  }, [])

  const handleExport = useCallback((): void => {
    if (controllerRef.current === null) {
      return
    }
    setModal({ mode: 'export' })
  }, [])

  const handleImport = useCallback((): void => {
    setModal({ mode: 'import' })
  }, [])

  const handleImportConfirm = useCallback((text: string): void => {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>
      if (typeof parsed === 'object' && parsed !== null && 'grid' in parsed) {
        controllerRef.current?.importLevel(parsed as unknown as LevelData)
        setReadout('Lab level loaded!')
      } else {
        controllerRef.current?.importMapDefinition(parsed as unknown as MapDefinition)
        setReadout('Game map loaded!')
      }
    } catch {
      setReadout('Invalid JSON')
    }
  }, [])

  return (
    <div className="mt-3 flex flex-col gap-3 xl:h-[calc(100vh-140px)] xl:flex-row">
      {/* Left toolbar */}
      <div className="flex w-full shrink-0 flex-col gap-2 rounded-xl border border-border/50 bg-card p-2 xl:w-[160px]">
        {/* Tools */}
        <div className="px-1 pb-1">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Brush</div>
          <div className="grid grid-cols-3 gap-1 xl:grid-cols-2">
            {PAINT_MODES.map((mode) => (
              <ToolButton
                key={mode.value}
                mode={mode}
                active={state.paint === mode.value}
                onClick={() => set({ paint: mode.value })}
              />
            ))}
          </div>
        </div>

        <div className="h-px bg-border/50" />

        {/* Palette */}
        <div className="px-1">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Palette</div>
          <Select value={state.palette} onValueChange={(v) => set({ palette: v })}>
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PALETTES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-px bg-border/50" />

        {/* Matrix overlay */}
        <div className="px-1">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Overlay</div>
          <Select
            value={state.matrixKind ?? 'off'}
            onValueChange={(v) => set({ matrixKind: (v === 'off' ? null : v) as MatrixMode | null })}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off</SelectItem>
              {MATRIX_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        {/* Import/Export */}
        <div className="flex flex-col gap-1 px-1">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Level</div>
          <Button variant="outline" size="sm" onClick={handleExport} className="w-full text-xs">
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport} className="w-full text-xs">
            Import
          </Button>
        </div>

        <div className="h-px bg-border/50" />

        {/* Camera */}
        <div className="flex flex-col gap-1 px-1">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Camera</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => controllerRef.current?.resetCamera()}
            className="w-full text-xs"
          >
            Fit view
          </Button>
        </div>

        <div className="h-px bg-border/50" />

        {/* Reset */}
        <div className="px-1">
          <Button variant="destructive" size="sm" onClick={reset} className="w-full text-xs">
            Reset Canvas
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex h-[55vh] min-h-0 min-w-0 flex-1 flex-col gap-2 xl:h-auto">
        <StatusBar state={state} readout={readout} />
        <div ref={hostRef} className="min-h-0 flex-1 rounded-xl border border-border/50 bg-background" />
      </div>

      {/* Modal */}
      {modal !== null && (
        <LevelModal
          mode={modal.mode}
          controller={controllerRef.current}
          onClose={() => setModal(null)}
          onImport={handleImportConfirm}
        />
      )}
    </div>
  )
}
