import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useTerrainChecks,
  useTerrainFileActions,
  useTerrainMount,
  useTerrainSelectionActions,
  useTerrainShortcuts
} from '../hooks/terrain-view-hooks'
import type { Cell } from '../lib/terrain-geometry'
import { DEFAULT_TERRAIN_STATE, type TerrainController, type TerrainState } from '../types/terrain-editor-data'
import { LevelModal } from './level-modal'
import { StatusBar } from './status-bar'
import { TerrainToolbar } from './terrain-toolbar'

/* ── Main component ────────────────────────────────────────────────── */

export function TerrainView({
  onControllerReady
}: {
  readonly onControllerReady?: (controller: TerrainController | null) => void
} = {}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const controllerRef = useRef<TerrainController | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [state, setState] = useState<TerrainState>({ ...DEFAULT_TERRAIN_STATE })
  const [readout, setReadout] = useState('Middle-drag to pan · wheel to zoom · select a tool to paint.')
  const [cursor, setCursor] = useState<Cell | null>(null)
  const [ready, setReady] = useState(false)
  const [modal, setModal] = useState<{ mode: 'export' | 'import' } | null>(null)

  const handleControllerReady = useCallback(
    (controller: TerrainController | null): void => {
      setReady(controller !== null)
      onControllerReady?.(controller)
    },
    [onControllerReady]
  )

  useTerrainMount(hostRef, controllerRef, handleControllerReady, setReadout, setCursor)
  useTerrainChecks()
  useTerrainShortcuts(controllerRef, setState)

  useEffect(() => {
    controllerRef.current?.setState(state)
  }, [state])

  const selection = useTerrainSelectionActions(controllerRef, setState)
  const fileActions = useTerrainFileActions(controllerRef, setReadout, fileInputRef, setModal)

  return (
    <div className="mt-3 flex flex-col gap-3 md:h-[calc(100vh-140px)] md:flex-row">
      <TerrainToolbar
        state={state}
        controller={controllerRef.current}
        fileInputRef={fileInputRef}
        onPatch={selection.onPatch}
        onSelectDecoKind={selection.onSelectDecoKind}
        onFileChange={fileActions.handleFileChange}
        onExport={fileActions.handleExport}
        onImport={fileActions.handleImport}
        onDownload={fileActions.handleDownload}
        onUploadClick={fileActions.handleUploadClick}
        onPlaytest={fileActions.handlePlaytest}
        onClearSaved={fileActions.handleClearSaved}
        onReset={selection.onReset}
      />
      <div className="flex h-[55vh] min-h-[420px] min-w-0 flex-1 flex-col gap-2 md:h-auto md:min-h-0">
        <StatusBar state={state} readout={readout} cursor={cursor} onPatch={selection.onPatch} />
        <div
          ref={hostRef}
          data-testid="terrain-canvas-host"
          data-controller-ready={ready ? 'true' : 'false'}
          className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-border/50 bg-background"
        />
      </div>
      {modal !== null && (
        <LevelModal
          mode={modal.mode}
          controller={controllerRef.current}
          onClose={() => setModal(null)}
          onImport={fileActions.handleImportConfirm}
        />
      )}
    </div>
  )
}
