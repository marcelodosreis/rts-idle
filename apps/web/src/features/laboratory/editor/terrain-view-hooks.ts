import type { DressingKind } from '@rts/renderer'
import { type ChangeEvent, type Dispatch, type RefObject, type SetStateAction, useCallback, useEffect } from 'react'
import { writePlaytestMap } from '../../../shared/config/playtest-map'
import { check, registerChecks } from '../shared/core/checks.js'
import { useLabContext } from '../shared/lab-context'
import {
  createTerrainController,
  isLevelData,
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

type SetState = Dispatch<SetStateAction<TerrainState>>

/** Mounts the terrain controller with autosave/restore and exposes readiness via callback. */
export function useTerrainMount(
  hostRef: RefObject<HTMLDivElement | null>,
  controllerRef: RefObject<TerrainController | null>,
  onControllerReady: ((controller: TerrainController | null) => void) | undefined,
  setReadout: (value: string) => void,
  setCursor: (value: Cell | null) => void
): void {
  const ctx = useLabContext()

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
      onControllerReady?.(controller)
    })
    return () => {
      disposed = true
      if (saveTimer !== null) {
        clearTimeout(saveTimer)
      }
      controllerRef.current?.destroy()
      controllerRef.current = null
      onControllerReady?.(null)
    }
  }, [ctx, hostRef, controllerRef, onControllerReady, setCursor, setReadout])
}

function isTextInput(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
}

function handleUndoRedo(
  event: KeyboardEvent,
  controllerRef: RefObject<TerrainController | null>,
  setState: SetState
): boolean {
  const chord = event.ctrlKey || event.metaKey
  if (!chord || event.key !== 'z') {
    return false
  }
  event.preventDefault()
  const snap = event.shiftKey ? controllerRef.current?.redo() : controllerRef.current?.undo()
  if (snap !== null && snap !== undefined) {
    setState((prev) => ({ ...prev }))
  }
  return true
}

function paintForKey(key: string): TerrainState['paint'] | undefined {
  switch (key) {
    case '1':
      return 'land'
    case '2':
      return 'water'
    case '3':
      return 'eraser'
    case '4':
      return 'elevated'
    default:
      return undefined
  }
}

function handleKeys(event: KeyboardEvent, setState: SetState): boolean {
  const paint = paintForKey(event.key)
  if (paint !== undefined) {
    setState((prev) => ({ ...prev, paint, editorTab: 'terrain' }))
    return true
  }
  if (event.key === 't' || event.key === 'T') {
    setState((prev) => ({ ...prev, editorTab: 'terrain' }))
    return true
  }
  if (event.key === 'd' || event.key === 'D') {
    setState((prev) => ({ ...prev, editorTab: 'decorations' }))
    return true
  }
  if (event.key === 'Escape') {
    setState((prev) => ({ ...prev, paint: 'land', editorTab: 'terrain', selectedDecoKind: null }))
    return true
  }
  return false
}

/** Keyboard shortcuts: undo/redo, terrain brushes, tabs, and escape. */
export function useTerrainShortcuts(controllerRef: RefObject<TerrainController | null>, setState: SetState): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (isTextInput(event.target)) {
        return
      }
      if (handleUndoRedo(event, controllerRef, setState) || handleKeys(event, setState)) {
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [controllerRef, setState])
}

/** Registers the lab debug checks for the terrain playground. */
export function useTerrainChecks(): void {
  const ctx = useLabContext()
  useEffect(() => {
    registerChecks('terrainPlayground', () => [
      check('atlas loaded', ctx.art),
      check('foam frames', true, '16 frames expected')
    ])
  }, [ctx])
}

export interface TerrainFileActions {
  readonly applyMapJson: (text: string, successMessage: string) => boolean
  readonly handleImportConfirm: (text: string) => void
  readonly handleExport: () => void
  readonly handleImport: () => void
  readonly handleDownload: () => void
  readonly handleUploadClick: () => void
  readonly handleFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  readonly handleClearSaved: () => void
  readonly handlePlaytest: () => void
}

/** JSON/text level actions for the editor toolbar. */
export function useTerrainJsonActions(
  controllerRef: RefObject<TerrainController | null>,
  setReadout: (value: string) => void
): Pick<TerrainFileActions, 'applyMapJson' | 'handleImportConfirm'> {
  const applyMapJson = useCallback(
    (text: string, successMessage: string): boolean => {
      const result = parseMapJson(text)
      if (result.ok && result.map !== undefined) {
        controllerRef.current?.importMapDefinition(result.map)
        setReadout(successMessage)
        return true
      }
      setReadout(`Invalid map: ${result.errors[0] ?? 'unknown error'}`)
      return false
    },
    [controllerRef, setReadout]
  )

  const handleImportConfirm = useCallback(
    (text: string): void => {
      try {
        const parsed: unknown = JSON.parse(text)
        if (isLevelData(parsed)) {
          controllerRef.current?.importLevel(parsed)
          setReadout('Lab level loaded!')
          return
        }
      } catch {
        // Fall through to the validated game-format parser for a clear error.
      }
      applyMapJson(text, 'Game map loaded!')
    },
    [applyMapJson, controllerRef, setReadout]
  )

  return { applyMapJson, handleImportConfirm }
}

/** File transfer actions (export/import/download/upload/clear) for the toolbar. */
export function useTerrainTransferActions(
  controllerRef: RefObject<TerrainController | null>,
  setReadout: (value: string) => void,
  fileInputRef: RefObject<HTMLInputElement | null>,
  setModal: (value: { mode: 'export' | 'import' } | null) => void,
  applyMapJson: (text: string, successMessage: string) => boolean
): Pick<
  TerrainFileActions,
  'handleExport' | 'handleImport' | 'handleDownload' | 'handleUploadClick' | 'handleFileChange' | 'handleClearSaved'
> {
  return {
    handleExport: () => {
      if (controllerRef.current !== null) {
        setModal({ mode: 'export' })
      }
    },
    handleImport: () => setModal({ mode: 'import' }),
    handleDownload: () => {
      const controller = controllerRef.current
      if (controller === null) {
        return
      }
      downloadMapJson(controller.exportMapDefinition())
      setReadout('Downloaded map.json')
    },
    handleUploadClick: () => fileInputRef.current?.click(),
    handleFileChange: async (event) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (file !== undefined) {
        applyMapJson(await file.text(), `Loaded ${file.name}`)
      }
    },
    handleClearSaved: () => {
      window.localStorage.removeItem(EDITOR_STORAGE_KEY)
      setReadout('Cleared saved map.')
    }
  }
}

/** Opens the current editor map in the game via the playtest bridge. */
export function useTerrainPlaytest(
  controllerRef: RefObject<TerrainController | null>
): Pick<TerrainFileActions, 'handlePlaytest'> {
  const handlePlaytest = useCallback((): void => {
    const controller = controllerRef.current
    if (controller === null) {
      return
    }
    writePlaytestMap(window.localStorage, controller.exportMapDefinition())
    window.open('/?map=local&scenario=ffa', '_blank')
  }, [controllerRef])
  return { handlePlaytest }
}

/** File/level actions for the editor toolbar. */
export function useTerrainFileActions(
  controllerRef: RefObject<TerrainController | null>,
  setReadout: (value: string) => void,
  fileInputRef: RefObject<HTMLInputElement | null>,
  setModal: (value: { mode: 'export' | 'import' } | null) => void
): TerrainFileActions {
  const json = useTerrainJsonActions(controllerRef, setReadout)
  const transfer = useTerrainTransferActions(controllerRef, setReadout, fileInputRef, setModal, json.applyMapJson)
  const playtest = useTerrainPlaytest(controllerRef)
  return { ...json, ...transfer, ...playtest }
}

/** Selection/reset actions for the editor toolbar. */
export function useTerrainSelectionActions(
  controllerRef: RefObject<TerrainController | null>,
  setState: SetState
): {
  readonly onPatch: (patch: Partial<TerrainState>) => void
  readonly onReset: () => void
  readonly onSelectDecoKind: (kind: DressingKind) => void
} {
  const onPatch = useCallback(
    (patch: Partial<TerrainState>): void => {
      setState((prev) => ({ ...prev, ...patch }))
    },
    [setState]
  )
  const onReset = useCallback((): void => {
    controllerRef.current?.reset()
  }, [controllerRef])
  const onSelectDecoKind = useCallback(
    (kind: DressingKind): void => {
      onPatch({ paint: 'decor', selectedDecoKind: kind, selectedVariant: 0, editorTab: 'decorations' })
    },
    [onPatch]
  )
  return { onPatch, onReset, onSelectDecoKind }
}
