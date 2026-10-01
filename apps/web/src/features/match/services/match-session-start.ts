import type { MatchConfig, ScenarioSummary, SnapshotBuilding } from '@rts/protocol'
import { type GameRenderer, type InputProfile, PixiRenderer } from '@rts/renderer'
import type { CommandIntent, MapDefinition, MatchResult, ResearchType } from '@rts/shared'
import { FIXED_SCALE, fixedToRenderPixels, renderPixelsToFixed, TILE_PIXELS } from '@rts/shared'
import type { MutableRefObject } from 'react'
import { connectMatch } from '../../../shared/transport/connection'
import { type CommandModes, isBuildMode } from '../hooks/use-command-modes'
import type { HudNotification } from '../lib/hud-notifications'
import { type MatchPlacement, placementFor } from '../lib/placement'
import { selectUnitsInBox } from '../lib/select-units-in-box'
import type { HudConstruction, HudMineral, HudSelectionUnit } from '../types/hud-types'
import { createWorldInteractionHandler } from './create-world-interaction-handler'
import { createRtsDebug } from './match-debug'
import { MatchInteractionController } from './match-interaction-controller'
import type { MatchSessionConnectionOwner } from './match-session-connection'
import { createMatchSessionHandlers } from './match-session-handlers'
import { createMatchRendererLifecycle } from './match-session-renderer'
import { createMatchSessionRuntime, type MatchSessionRuntime } from './match-session-runtime'

export interface SessionResources {
  readonly mineral: number
  readonly supply: number
  readonly reservedSupply: number
  readonly supplyCap: number
  readonly castleTier: number
  readonly completedResearch: readonly ResearchType[]
  readonly queuedResearch: readonly ResearchType[]
}

/** The subset of command-mode state the session lifecycle depends on. */
export type SessionCommandModes = Pick<CommandModes, 'modeRef' | 'clear'>

export interface MatchSessionSetters {
  readonly setSelectionUnits: (units: readonly HudSelectionUnit[]) => void
  readonly setSelectedConstruction: (value: HudConstruction | null) => void
  readonly setSelectedMineral: (value: HudMineral | null) => void
  readonly setBuildHint: (value: string | null) => void
  readonly setHudNotification: (value: HudNotification | null) => void
  readonly setStatus: (value: string) => void
  readonly setTick: (value: number) => void
  readonly setUnitCount: (value: number) => void
  readonly setResources: (value: SessionResources | null) => void
  readonly appendCompletedConstructions: (value: readonly SnapshotBuilding[]) => void
  readonly setMatchResult: (value: MatchResult | null) => void
  readonly setMatchConfig: (value: MatchConfig | null) => void
  readonly setScenarios: (value: readonly ScenarioSummary[]) => void
}

export interface MatchSessionRefs {
  readonly runtimeRef: MutableRefObject<MatchSessionRuntime | null>
  readonly rendererRef: MutableRefObject<GameRenderer | null>
  readonly matchEndedRef: MutableRefObject<boolean>
  readonly connectionOwnerRef: MutableRefObject<MatchSessionConnectionOwner>
  readonly inputProfileRef: MutableRefObject<InputProfile>
}

export interface MatchSessionStartParams {
  readonly host: HTMLDivElement
  readonly playtestMap: MapDefinition | null
  readonly commandModes: SessionCommandModes
  readonly refs: MatchSessionRefs
  readonly setters: MatchSessionSetters
  readonly serverUrl: string
  readonly scenarioId: string
  readonly aggression: 'offensive' | 'passive'
  readonly spritesEnabled: boolean
  readonly humanPlayer: number
  readonly appendLog: (kind: 'command' | 'event' | 'info' | 'error', message: string) => void
}

interface SelectionUpdaters {
  readonly updateSelection: (ids: readonly number[]) => void
  readonly updateConstructionSelection: (id: number) => void
  readonly updateMineralSelection: (id: number) => void
}

function createSelectionUpdaters(runtime: MatchSessionRuntime, setters: MatchSessionSetters): SelectionUpdaters {
  const apply = (selection: ReturnType<MatchSessionRuntime['selectUnits']>): void => {
    setters.setSelectionUnits(selection.units)
    setters.setSelectedConstruction(selection.construction)
    setters.setSelectedMineral(selection.mineral)
    const construction = selection.construction
    const producerId =
      construction !== null &&
      construction.status === 'COMPLETED' &&
      (construction.buildingType === 'CASTLE' ||
        construction.buildingType === 'BARRACKS' ||
        construction.buildingType === 'ARCHERY' ||
        construction.buildingType === 'MONASTERY')
        ? construction.id
        : null
    runtime.renderer?.setSelectedRallyProducer(producerId)
    runtime.renderer?.setSelectedRallyPoint(
      producerId === null || construction?.rallyPoint === null || construction?.rallyPoint === undefined
        ? null
        : {
            x: fixedToRenderPixels(construction.rallyPoint.x),
            y: fixedToRenderPixels(construction.rallyPoint.y)
          }
    )
  }
  return {
    updateSelection: (ids) => apply(runtime.selectUnits(ids)),
    updateConstructionSelection: (id) => apply(runtime.selectConstruction(id)),
    updateMineralSelection: (id) => apply(runtime.selectMineral(id))
  }
}

interface CommandBridge {
  readonly cancelPlacement: () => void
  readonly sendCommand: (intent: CommandIntent) => void
  readonly placement: (x: number, y: number) => MatchPlacement | null
  readonly updatePreview: (x: number, y: number) => void
}

function createCommandBridge(params: MatchSessionStartParams, runtime: MatchSessionRuntime): CommandBridge {
  const { commandModes, refs, setters, appendLog } = params
  const cancelPlacement = (): void => {
    if (isBuildMode(commandModes.modeRef.current)) {
      commandModes.clear()
      runtime.renderer?.setBuildPreview(null)
      setters.setBuildHint(null)
    }
  }
  const sendCommand = (intent: CommandIntent): void => {
    if (refs.connectionOwnerRef.current.send(intent, runtime.matchEnded)) {
      appendLog('command', `${intent.type} → ${JSON.stringify(intent.payload)}`)
    }
  }
  const placement = (x: number, y: number): MatchPlacement | null =>
    placementFor({
      mode: commandModes.modeRef.current,
      map: runtime.map,
      buildCatalog: runtime.buildCatalog,
      buildings: runtime.buildings,
      worldX: x,
      worldY: y
    })
  const updatePreview = (x: number, y: number): void => {
    const value = placement(x, y)
    runtime.renderer?.setBuildPreview(value)
    setters.setBuildHint(value?.valid ? 'Valid location — click to build.' : (value?.reason ?? null))
  }
  return { cancelPlacement, sendCommand, placement, updatePreview }
}

function createInteraction(
  params: MatchSessionStartParams,
  runtime: MatchSessionRuntime,
  updaters: SelectionUpdaters,
  bridge: CommandBridge
): (interaction: Parameters<ReturnType<typeof createWorldInteractionHandler>>[0]) => void {
  const { commandModes, humanPlayer } = params
  const { updateSelection, updateConstructionSelection, updateMineralSelection } = updaters
  const controller = new MatchInteractionController({
    isMatchEnded: () => runtime.matchEnded,
    selectedUnitIds: () => runtime.selectedIds,
    selectedConstructionId: () => runtime.selectedConstructionId,
    mode: () => commandModes.modeRef.current,
    unitStates: runtime.unitStates,
    buildings: () => runtime.buildings,
    placementFor: bridge.placement,
    toCommandPoint: (x, y) => ({ x: Math.round(renderPixelsToFixed(x)), y: Math.round(renderPixelsToFixed(y)) }),
    placementToCommandPoint: (value) => ({ x: value.x / FIXED_SCALE, y: value.y / FIXED_SCALE }),
    buildingToCommandPoint: (building) => ({ x: building.x / FIXED_SCALE, y: building.y / FIXED_SCALE }),
    sendCommand: bridge.sendCommand,
    clearMode: commandModes.clear,
    cancelPlacement: bridge.cancelPlacement,
    setBuildHint: params.setters.setBuildHint,
    humanPlayer
  })
  return createWorldInteractionHandler({
    controller,
    updateSelection,
    selectAtWorldPoint: (x, y) =>
      updateSelection(
        selectUnitsInBox(
          runtime.unitPositions,
          { x: renderPixelsToFixed(x), y: renderPixelsToFixed(y) },
          { x: renderPixelsToFixed(x), y: renderPixelsToFixed(y) }
        )
      ),
    selectBuilding: updateConstructionSelection,
    selectMineral: updateMineralSelection,
    clearMode: commandModes.clear,
    selectBox: (value) =>
      updateSelection(
        selectUnitsInBox(
          runtime.unitPositions,
          { x: renderPixelsToFixed(value.worldFrom.x), y: renderPixelsToFixed(value.worldFrom.y) },
          { x: renderPixelsToFixed(value.worldTo.x), y: renderPixelsToFixed(value.worldTo.y) }
        )
      ),
    updatePreview: bridge.updatePreview
  })
}

/** Wires the match session side effects; returns the effect cleanup. */
export function startMatchSession(params: MatchSessionStartParams): () => void {
  const { refs, setters, commandModes } = params
  const runtime = createMatchSessionRuntime()
  refs.runtimeRef.current = runtime
  refs.matchEndedRef.current = false

  const updaters = createSelectionUpdaters(runtime, setters)
  const bridge = createCommandBridge(params, runtime)
  const handler = createInteraction(params, runtime, updaters, bridge)
  const rendererLifecycle = createRendererView(params, runtime, handler, updaters)
  const handlers = createSessionHandlers(params, runtime, rendererLifecycle, updaters, bridge)
  const connection = connectMatch(
    params.serverUrl,
    {
      type: 'match_request',
      scenarioId: params.scenarioId,
      aggression: params.aggression,
      map: params.playtestMap === null ? { source: 'catalog' } : { source: 'local', definition: params.playtestMap }
    },
    handlers
  )
  refs.connectionOwnerRef.current.set(connection)
  const removeListeners = installSessionListeners(bridge.cancelPlacement, commandModes.clear)

  return () => {
    runtime.sessionActive = false
    removeListeners()
    refs.connectionOwnerRef.current.cleanup(connection)
    rendererLifecycle.dispose()
    refs.rendererRef.current = null
    refs.runtimeRef.current = null
    delete window.__rtsDebug
  }
}

function createRendererView(
  params: MatchSessionStartParams,
  runtime: MatchSessionRuntime,
  handler: (interaction: Parameters<ReturnType<typeof createWorldInteractionHandler>>[0]) => void,
  updaters: SelectionUpdaters
): ReturnType<typeof createMatchRendererLifecycle> {
  const { refs, playtestMap, spritesEnabled, appendLog } = params
  return createMatchRendererLifecycle({
    host: params.host,
    runtime,
    callbacks: { onInteraction: handler },
    rendererFactory: (config) =>
      new PixiRenderer({
        worldWidth: config.map.width * TILE_PIXELS,
        worldHeight: config.map.height * TILE_PIXELS,
        initialZoom: 1,
        initialCenter: { x: fixedToRenderPixels(2048), y: fixedToRenderPixels(2048) },
        assetsUrl: spritesEnabled ? '/assets' : '',
        map: config.map,
        inputProfile: refs.inputProfileRef.current
      }),
    onReady: (renderer, config) => {
      refs.rendererRef.current = renderer
      window.__rtsDebug = createRtsDebug({
        renderer,
        config,
        isPlaytest: playtestMap !== null,
        unitStates: runtime.unitStates,
        buildings: () => runtime.buildings,
        setSelection: updaters.updateSelection,
        getTick: () => runtime.lastTick,
        fixedToRenderPixels,
        readyState: () => ({
          configReceived: runtime.configReceived,
          snapshotReceived: runtime.snapshotReceived,
          rendererReady: runtime.rendererReady,
          firstFramePresented: runtime.firstFramePresented,
          rendererError: runtime.rendererError,
          tick: runtime.lastTick,
          ready:
            runtime.configReceived &&
            runtime.snapshotReceived &&
            runtime.rendererReady &&
            runtime.firstFramePresented &&
            runtime.rendererError === null
        })
      })
    },
    onFramePresented: () => {
      runtime.firstFramePresented = true
    },
    onError: (error) => {
      refs.rendererRef.current = null
      runtime.rendererError = error instanceof Error ? error.message : String(error)
      appendLog('error', runtime.rendererError)
    }
  })
}

function createSessionHandlers(
  params: MatchSessionStartParams,
  runtime: MatchSessionRuntime,
  rendererLifecycle: ReturnType<typeof createMatchRendererLifecycle>,
  updaters: SelectionUpdaters,
  bridge: CommandBridge
): ReturnType<typeof createMatchSessionHandlers> {
  const { setters, appendLog, commandModes, refs } = params
  return createMatchSessionHandlers({
    runtime,
    clearCommandMode: commandModes.clear,
    appendLog,
    cancelPlacement: bridge.cancelPlacement,
    updateConstructionSelection: updaters.updateConstructionSelection,
    updateSelection: updaters.updateSelection,
    setStatus: setters.setStatus,
    setTick: setters.setTick,
    setUnitCount: setters.setUnitCount,
    setResources: setters.setResources,
    appendCompletedConstructions: setters.appendCompletedConstructions,
    setHudNotification: setters.setHudNotification,
    setSelectedMineral: setters.setSelectedMineral,
    setMatchResult: (result) => {
      refs.matchEndedRef.current = true
      setters.setMatchResult(result)
    },
    present: rendererLifecycle.present,
    onMatchConfig: (config) => {
      runtime.configReceived = true
      runtime.map = config.map
      runtime.buildCatalog = config.buildings
      setters.setMatchConfig(config)
      setters.setScenarios(config.scenarios)
      appendLog('info', `Match config: ${config.scenario.id} (${config.buildings.length} buildings)`)
      rendererLifecycle.mount(config)
    },
    setScenarios: setters.setScenarios
  })
}

function installSessionListeners(cancelPlacement: () => void, clearMode: () => void): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      cancelPlacement()
      clearMode()
    }
  }
  const onWindowBlur = (): void => {
    cancelPlacement()
    clearMode()
  }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('blur', onWindowBlur)
  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('blur', onWindowBlur)
  }
}
