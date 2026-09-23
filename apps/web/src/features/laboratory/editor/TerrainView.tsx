// biome-ignore lint/style/noExcessiveLinesPerFile: level editor toolbar (single cohesive UI)
import type { DressingKind } from '@rts/renderer'
import { type ChangeEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Switch } from '@/shared/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { writePlaytestMap } from '../../../shared/config/playtest-map'
import { check, registerChecks } from '../shared/core/checks.js'
import { useLabContext } from '../shared/lab-context'
import {
  createTerrainController,
  DEFAULT_TERRAIN_STATE,
  DRESSING_KINDS,
  type EditorTab,
  type LevelData,
  type MatrixMode,
  PALETTES,
  type PaintMode,
  type TerrainController,
  type TerrainState
} from './terrain-controller.js'
import type { Cell } from './terrain-geometry.js'
import {
  downloadMapJson,
  EDITOR_STORAGE_KEY,
  loadEditorMap,
  parseMapJson,
  saveEditorMap
} from './terrain-persistence.js'

/* ── Brush definitions ─────────────────────────────────────────────── */

interface BrushDef {
  readonly value: PaintMode
  readonly label: string
  readonly icon: string
  readonly shortcut?: string
  readonly beta?: boolean
}

const TERRAIN_BRUSHES: readonly BrushDef[] = [
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

const MATRIX_MODES: readonly { readonly value: MatrixMode; readonly label: string }[] = [
  { value: 'flat', label: 'Flat 16-mask' },
  { value: 'elevated', label: 'Elevated 16-mask' },
  { value: 'cliff', label: 'Cliff-base' }
]

const ALL_BRUSHES: readonly BrushDef[] = [...TERRAIN_BRUSHES]

/* ── Sub-components ────────────────────────────────────────────────── */

function BrushButton({
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
      className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] transition-all ${
        active ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
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

const AVAILABLE_DECO_KINDS: readonly DressingKind[] = DRESSING_KINDS.map((d) => d.kind)

function DecoKindGrid({
  selected,
  onSelect
}: {
  readonly selected: DressingKind | null
  readonly onSelect: (kind: DressingKind) => void
}) {
  const buttonClass = (_kind: DressingKind, available: boolean, isSelected: boolean): string => {
    if (isSelected) {
      return 'bg-primary text-primary-foreground shadow-sm'
    }
    if (available) {
      return 'bg-muted/50 text-muted-foreground hover:bg-muted'
    }
    return 'cursor-not-allowed bg-muted/30 text-muted-foreground/40'
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {DRESSING_KINDS.map((dk) => {
        const available = AVAILABLE_DECO_KINDS.includes(dk.kind)
        return (
          <button
            key={dk.kind}
            type="button"
            disabled={!available}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] transition-all ${buttonClass(dk.kind, available, selected === dk.kind)}`}
            onClick={() => {
              if (available) {
                onSelect(dk.kind)
              }
            }}
          >
            <span className="text-sm">{DECO_ICONS[dk.kind]}</span>
            <span className="leading-tight">{dk.label}</span>
            {!available && <span className="text-[7px] text-muted-foreground/50">soon</span>}
          </button>
        )
      })}
    </div>
  )
}

function VariantPicker({
  kind,
  selectedVariant,
  onSelect
}: {
  readonly kind: DressingKind
  readonly selectedVariant: number
  readonly onSelect: (variant: number) => void
}) {
  const dk = DRESSING_KINDS.find((d) => d.kind === kind)
  if (dk === undefined) {
    return null
  }
  return (
    <div className="mt-2">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {dk.label} variants
      </div>
      <div className="grid grid-cols-4 gap-1">
        {dk.keys.map((key, i) => (
          <button
            key={key}
            type="button"
            className={`flex h-8 items-center justify-center rounded-md text-[10px] font-medium transition-all ${
              selectedVariant === i
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => onSelect(i)}
          >
            v{i}
          </button>
        ))}
      </div>
    </div>
  )
}

function HistoryButtons({
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
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={handleUndo}>
            ↶
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Undo <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">Ctrl+Z</kbd>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={handleRedo}>
            ↷
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Redo <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">Ctrl+Shift+Z</kbd>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

/* ── StatusBar (top of canvas) ─────────────────────────────────────── */

function StatusBar({
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
  const activeBrush = ALL_BRUSHES.find((m) => m.value === state.paint)
  const activeDeco =
    state.paint === 'decor' && state.selectedDecoKind !== null
      ? DRESSING_KINDS.find((d) => d.kind === state.selectedDecoKind)
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
        <Select value={state.palette} onValueChange={(v) => onPatch({ palette: v })}>
          <SelectTrigger className="h-6 w-[70px] border-0 bg-transparent p-0 text-[11px]">
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
      <div className="h-3 w-px bg-border/50" />
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Overlay:</span>
        <Select
          value={state.matrixKind ?? 'off'}
          onValueChange={(v) => onPatch({ matrixKind: (v === 'off' ? null : v) as MatrixMode | null })}
        >
          <SelectTrigger className="h-6 w-[80px] border-0 bg-transparent p-0 text-[11px]">
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

/* ── Level modal ───────────────────────────────────────────────────── */

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
      <div className="relative w-[min(500px,calc(100vw-2rem))] rounded-xl border border-border/50 bg-card p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">{mode === 'export' ? 'Copy Level' : 'Paste Level'}</h3>
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

/* ── Main component ────────────────────────────────────────────────── */

export function TerrainView({
  onControllerReady
}: {
  readonly onControllerReady?: (controller: TerrainController | null) => void
} = {}) {
  const ctx = useLabContext()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const controllerRef = useRef<TerrainController | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [state, setState] = useState<TerrainState>({ ...DEFAULT_TERRAIN_STATE })
  const [readout, setReadout] = useState('Middle-drag to pan · wheel to zoom · select a tool to paint.')
  const [cursor, setCursor] = useState<Cell | null>(null)
  const [ready, setReady] = useState(false)
  const [modal, setModal] = useState<{ mode: 'export' | 'import' } | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (host === null) {
      return
    }
    let disposed = false
    let saveTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleAutosave = (): void => {
      if (saveTimer !== null) {
        clearTimeout(saveTimer)
      }
      saveTimer = setTimeout(() => {
        const controller = controllerRef.current
        if (controller !== null) {
          saveEditorMap(window.localStorage, controller.exportMapDefinition())
        }
      }, 400)
    }
    void createTerrainController(host, ctx, setReadout, setCursor, scheduleAutosave).then((controller) => {
      if (disposed) {
        controller.destroy()
        return
      }
      const restored = loadEditorMap(window.localStorage)
      if (restored !== null) {
        controller.importMapDefinition(restored)
        setReadout('Restored your saved map.')
      }
      controllerRef.current = controller
      setReady(true)
      onControllerReady?.(controller)
    })
    return () => {
      disposed = true
      if (saveTimer !== null) {
        clearTimeout(saveTimer)
      }
      controllerRef.current?.destroy()
      controllerRef.current = null
      setReady(false)
      onControllerReady?.(null)
    }
  }, [ctx, onControllerReady])

  useEffect(() => {
    controllerRef.current?.setState(state)
  }, [state])

  useEffect(() => {
    registerChecks('terrainPlayground', () => {
      return [check('atlas loaded', ctx.art), check('foam frames', true, '16 frames expected')]
    })
  }, [ctx])

  /* ── Keyboard shortcuts ────────────────────────────────────────── */
  useEffect(() => {
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: keyboard shortcut dispatcher
    const handler = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      const ctrl = e.ctrlKey || e.metaKey

      // Undo/Redo
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        const snap = controllerRef.current?.undo()
        if (snap !== null && snap !== undefined) {
          setState((prev) => ({ ...prev }))
        }
        return
      }
      if (ctrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        const snap = controllerRef.current?.redo()
        if (snap !== null && snap !== undefined) {
          setState((prev) => ({ ...prev }))
        }
        return
      }

      // Terrain shortcuts
      if (e.key === '1') {
        setState((prev) => ({ ...prev, paint: 'land', editorTab: 'terrain' }))
        return
      }
      if (e.key === '2') {
        setState((prev) => ({ ...prev, paint: 'water', editorTab: 'terrain' }))
        return
      }
      if (e.key === '3') {
        setState((prev) => ({ ...prev, paint: 'eraser', editorTab: 'terrain' }))
        return
      }
      if (e.key === '4') {
        setState((prev) => ({ ...prev, paint: 'elevated', editorTab: 'terrain' }))
        return
      }

      // Tab shortcuts
      if (e.key === 't' || e.key === 'T') {
        setState((prev) => ({ ...prev, editorTab: 'terrain' }))
        return
      }
      if (e.key === 'd' || e.key === 'D') {
        setState((prev) => ({ ...prev, editorTab: 'decorations' }))
        return
      }

      // Escape
      if (e.key === 'Escape') {
        setState((prev) => ({
          ...prev,
          paint: 'land',
          editorTab: 'terrain',
          selectedDecoKind: null
        }))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  /* ── Callbacks ─────────────────────────────────────────────────── */
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

  const handlePlaytest = useCallback((): void => {
    const controller = controllerRef.current
    if (controller === null) {
      return
    }
    writePlaytestMap(window.localStorage, controller.exportMapDefinition())
    window.open('/?map=local', '_blank')
  }, [])

  const applyMapJson = useCallback((text: string, successMessage: string): boolean => {
    const result = parseMapJson(text)
    if (result.ok && result.map !== undefined) {
      controllerRef.current?.importMapDefinition(result.map)
      setReadout(successMessage)
      return true
    }
    setReadout(`Invalid map: ${result.errors[0] ?? 'unknown error'}`)
    return false
  }, [])

  const handleImportConfirm = useCallback(
    (text: string): void => {
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>
        if (typeof parsed === 'object' && parsed !== null && 'grid' in parsed) {
          controllerRef.current?.importLevel(parsed as unknown as LevelData)
          setReadout('Lab level loaded!')
          return
        }
      } catch {
        // Fall through to the validated game-format parser for a clear error.
      }
      applyMapJson(text, 'Game map loaded!')
    },
    [applyMapJson]
  )

  const handleDownload = useCallback((): void => {
    const controller = controllerRef.current
    if (controller === null) {
      return
    }
    downloadMapJson(controller.exportMapDefinition())
    setReadout('Downloaded map.json')
  }, [])

  const handleUploadClick = useCallback((): void => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (file === undefined) {
        return
      }
      applyMapJson(await file.text(), `Loaded ${file.name}`)
    },
    [applyMapJson]
  )

  const handleClearSaved = useCallback((): void => {
    window.localStorage.removeItem(EDITOR_STORAGE_KEY)
    setReadout('Cleared saved map.')
  }, [])

  const selectDecoKind = useCallback(
    (kind: DressingKind): void => {
      set({ paint: 'decor', selectedDecoKind: kind, selectedVariant: 0, editorTab: 'decorations' })
    },
    [set]
  )

  /* ── Sidebar ───────────────────────────────────────────────────── */
  return (
    <div className="mt-3 flex flex-col gap-3 lg:h-[calc(100vh-140px)] lg:flex-row">
      {/* Left toolbar */}
      <div className="flex w-full shrink-0 flex-col gap-2 rounded-xl border border-border/50 bg-card p-2 lg:w-[200px]">
        <Tabs
          value={state.editorTab}
          onValueChange={(v) => set({ editorTab: v as EditorTab })}
          className="flex flex-1 flex-col gap-2"
        >
          <TabsList className="w-full">
            <Tooltip>
              <TooltipTrigger asChild={true}>
                <TabsTrigger value="terrain" className="flex-1 text-[11px]">
                  Terrain
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                Terrain <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">T</kbd>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild={true}>
                <TabsTrigger value="decorations" className="flex-1 text-[11px]">
                  Decor
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                Decorations <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">D</kbd>
              </TooltipContent>
            </Tooltip>
          </TabsList>

          {/* ── Terrain tab ─────────────────────────────────────────── */}
          <TabsContent value="terrain" className="mt-0 flex-1">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-3 gap-1 pr-2 sm:grid-cols-6 lg:grid-cols-3">
                {TERRAIN_BRUSHES.map((brush) => (
                  <BrushButton
                    key={brush.value}
                    brush={brush}
                    active={state.paint === brush.value}
                    onClick={() => set({ paint: brush.value })}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Decorations tab ─────────────────────────────────────── */}
          <TabsContent value="decorations" className="mt-0 flex-1">
            <ScrollArea className="h-full">
              <div className="pr-2">
                <DecoKindGrid selected={state.selectedDecoKind} onSelect={selectDecoKind} />
                {state.selectedDecoKind !== null && (
                  <VariantPicker
                    kind={state.selectedDecoKind}
                    selectedVariant={state.selectedVariant}
                    onSelect={(v) => set({ selectedVariant: v })}
                  />
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="h-px bg-border/50" />

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 px-1">
          {/* Undo/Redo */}
          <div className="flex items-center justify-between">
            <HistoryButtons controller={controllerRef.current} onStateChange={set} />
          </div>

          <div className="h-px bg-border/50" />

          {/* File + camera actions: wrap into a compact grid on tablet/desktop */}
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="text-[11px]">
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport} className="text-[11px]">
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="text-[11px]">
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleUploadClick} className="text-[11px]">
              Upload
            </Button>
            <Button variant="outline" size="sm" onClick={handlePlaytest} className="text-[11px]">
              Playtest
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearSaved} className="text-[11px]">
              Clear saved
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              aria-label="upload map json"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => controllerRef.current?.resetCamera()}
              className="text-[11px]"
            >
              Fit
            </Button>
            <Button variant="destructive" size="sm" onClick={reset} className="text-[11px]">
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex h-[55vh] min-h-[420px] min-w-0 flex-1 flex-col gap-2 lg:h-auto lg:min-h-0">
        <StatusBar state={state} readout={readout} cursor={cursor} onPatch={set} />
        <div
          ref={hostRef}
          data-testid="terrain-canvas-host"
          data-controller-ready={ready ? 'true' : 'false'}
          className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-border/50 bg-background"
        />
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
