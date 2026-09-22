import type { BuildCatalogEntry, MatchConfig, ScenarioSummary } from '@rts/protocol'
import { type GameRenderer, type InputProfile, PixiRenderer } from '@rts/renderer'
import type { CommandIntent } from '@rts/shared'
import { FIXED_SCALE, fixedToRenderPixels, renderPixelsToFixed, TILE_PIXELS } from '@rts/shared'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { connectMatch } from '../client/connection'
import type { HudConstruction, HudMineral, HudSelectionUnit } from '../hud/types'
import { type CommandMode, isBuildMode, useCommandModes } from '../hud/useCommandModes'
import { createWorldInteractionHandler } from '../interaction/create-world-interaction-handler'
import { MatchInteractionController } from '../interaction/match-interaction-controller'
import { selectUnitsInBox } from '../interaction/select-units-in-box'
import { readInputPreferences, writeInputPreferences } from '../preferences/input-preferences'
import { createRtsDebug } from './match-debug'
import { createMatchSessionConnectionOwner } from './match-session-connection'
import { createMatchSessionHandlers } from './match-session-handlers'
import { placementFor } from './match-session-placement'
import { createMatchRendererLifecycle } from './match-session-renderer'
import { createMatchSessionRuntime } from './match-session-runtime'
import { readPlaytestMap } from './playtest-map'
import { type MessageLogEntry, useMessageLog } from './useMessageLog'

const SCENARIO = new URLSearchParams(window.location.search).get('scenario') ?? '6v6'
const AGGRESSION = (new URLSearchParams(window.location.search).get('aggression') ?? 'offensive') as
  | 'offensive'
  | 'passive'
const SPRITES_ENABLED = new URLSearchParams(window.location.search).get('sprites') !== 'off'
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'ws://localhost:8080'
const PLAYER_BASE_CENTER = { x: fixedToRenderPixels(2048), y: fixedToRenderPixels(2048) }
const HUMAN_PLAYER = 0
export interface MatchSessionState {
  readonly status: string
  readonly messageLog: readonly MessageLogEntry[]
  readonly unitCount: number
  readonly tick: number
  readonly selectionUnits: readonly HudSelectionUnit[]
  readonly selectedConstruction: HudConstruction | null
  readonly selectedMineral: HudMineral | null
  readonly resources: {
    readonly mineral: number
    readonly energy: number
    readonly supply: number
    readonly supplyCap: number
  } | null
  readonly commandMode: CommandMode
  readonly matchResult: 'victory' | 'defeat' | 'draw' | null
  readonly scenario: string
  readonly scenarios: readonly string[]
  readonly aggression: 'offensive' | 'passive'
  readonly spritesEnabled: boolean
  readonly inputProfile: InputProfile
  readonly buildHint: string | null
  readonly buildings: readonly BuildCatalogEntry[]
  arm(mode: Exclude<CommandMode, 'idle'>): void
  issueOrder(type: 'STOP' | 'HOLD'): void
  surrender(): void
  newMatch(): void
  changeScenario(id: string): void
  setAggression(value: 'offensive' | 'passive'): void
  setSpritesEnabled(value: boolean): void
  setInputProfile(value: InputProfile): void
}
export function useMatchSession(hostRef: RefObject<HTMLDivElement | null>): MatchSessionState {
  const [status, setStatus] = useState('connecting')
  const { messageLog, appendLog } = useMessageLog()
  const [unitCount, setUnitCount] = useState(0)
  const [tick, setTick] = useState(0)
  const [selectionUnits, setSelectionUnits] = useState<readonly HudSelectionUnit[]>([])
  const [selectedConstruction, setSelectedConstruction] = useState<HudConstruction | null>(null)
  const [selectedMineral, setSelectedMineral] = useState<HudMineral | null>(null)
  const [buildHint, setBuildHint] = useState<string | null>(null)
  const [resources, setResources] = useState<MatchSessionState['resources']>(null)
  const [matchResult, setMatchResult] = useState<MatchSessionState['matchResult']>(null)
  const [inputProfile, setInputProfileState] = useState<InputProfile>(
    () => readInputPreferences(window.localStorage).inputProfile
  )
  const inputProfileRef = useRef(inputProfile)
  const [matchConfig, setMatchConfig] = useState<MatchConfig | null>(null)
  const [scenarios, setScenarios] = useState<readonly ScenarioSummary[]>([])
  const commandModes = useCommandModes()
  const connectionOwnerRef = useRef(createMatchSessionConnectionOwner())
  const runtimeRef = useRef<ReturnType<typeof createMatchSessionRuntime> | null>(null)
  const rendererRef = useRef<GameRenderer | null>(null)
  const matchEndedRef = useRef(false)
  useEffect(() => {
    const host = hostRef.current
    if (host === null) {
      return
    }
    const playtestMap = readPlaytestMap(window.location.search, window.localStorage)
    const runtime = createMatchSessionRuntime()
    runtimeRef.current = runtime
    matchEndedRef.current = false
    const updateSelection = (ids: readonly number[]): void => {
      const selection = runtime.selectUnits(ids)
      setSelectionUnits(selection.units)
      setSelectedConstruction(selection.construction)
      setSelectedMineral(selection.mineral)
    }
    const updateConstructionSelection = (id: number): void => {
      const selection = runtime.selectConstruction(id)
      setSelectionUnits(selection.units)
      setSelectedConstruction(selection.construction)
      setSelectedMineral(selection.mineral)
    }
    const updateMineralSelection = (id: number): void => {
      const selection = runtime.selectMineral(id)
      setSelectionUnits(selection.units)
      setSelectedConstruction(selection.construction)
      setSelectedMineral(selection.mineral)
    }
    const cancelPlacement = (): void => {
      if (isBuildMode(commandModes.modeRef.current)) {
        commandModes.clear()
        runtime.renderer?.setBuildPreview(null)
        setBuildHint(null)
      }
    }
    const sendCommand = (intent: CommandIntent): void => {
      if (connectionOwnerRef.current.send(intent, runtime.matchEnded)) {
        appendLog('command', `${intent.type} → ${JSON.stringify(intent.payload)}`)
      }
    }
    const placement = (x: number, y: number) =>
      placementFor(commandModes.modeRef.current, runtime.map, runtime.buildCatalog, runtime.buildings, x, y)
    const updatePreview = (x: number, y: number): void => {
      const value = placement(x, y)
      runtime.renderer?.setBuildPreview(value)
      setBuildHint(value?.valid ? 'Valid location — click to build.' : (value?.reason ?? null))
    }
    const interactionController = new MatchInteractionController({
      isMatchEnded: () => runtime.matchEnded,
      selectedUnitIds: () => runtime.selectedIds,
      mode: () => commandModes.modeRef.current,
      unitStates: runtime.unitStates,
      buildings: () => runtime.buildings,
      placementFor: placement,
      toCommandPoint: (x, y) => ({ x: Math.round(renderPixelsToFixed(x)), y: Math.round(renderPixelsToFixed(y)) }),
      placementToCommandPoint: (value) => ({ x: value.x / FIXED_SCALE, y: value.y / FIXED_SCALE }),
      buildingToCommandPoint: (building) => ({ x: building.x / FIXED_SCALE, y: building.y / FIXED_SCALE }),
      sendCommand,
      clearMode: commandModes.clear,
      cancelPlacement,
      setBuildHint,
      humanPlayer: HUMAN_PLAYER
    })
    const handler = createWorldInteractionHandler({
      controller: interactionController,
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
      selectBox: (value) =>
        updateSelection(
          selectUnitsInBox(
            runtime.unitPositions,
            { x: renderPixelsToFixed(value.worldFrom.x), y: renderPixelsToFixed(value.worldFrom.y) },
            { x: renderPixelsToFixed(value.worldTo.x), y: renderPixelsToFixed(value.worldTo.y) }
          )
        ),
      updatePreview
    })
    const rendererLifecycle = createMatchRendererLifecycle({
      host,
      runtime,
      callbacks: { onInteraction: handler },
      rendererFactory: (config) =>
        new PixiRenderer({
          worldWidth: config.map.width * TILE_PIXELS,
          worldHeight: config.map.height * TILE_PIXELS,
          initialZoom: 1,
          initialCenter: PLAYER_BASE_CENTER,
          assetsUrl: SPRITES_ENABLED ? '/assets' : '',
          map: config.map,
          inputProfile: inputProfileRef.current
        }),
      onReady: (renderer, config) => {
        rendererRef.current = renderer
        window.__rtsDebug = createRtsDebug({
          renderer,
          config,
          isPlaytest: playtestMap !== null,
          unitStates: runtime.unitStates,
          buildings: () => runtime.buildings,
          setSelection: updateSelection,
          getTick: () => runtime.lastTick,
          fixedToRenderPixels
        })
      },
      onError: (error) => {
        rendererRef.current = null
        setStatus('error')
        appendLog('error', error instanceof Error ? error.message : String(error))
      }
    })
    const handlers = createMatchSessionHandlers({
      runtime,
      clearCommandMode: commandModes.clear,
      appendLog,
      cancelPlacement,
      updateConstructionSelection,
      updateSelection,
      setStatus,
      setTick,
      setUnitCount,
      setResources,
      setSelectedMineral,
      setMatchResult: (result) => {
        matchEndedRef.current = true
        setMatchResult(result)
      },
      present: rendererLifecycle.present,
      onMatchConfig: (config) => {
        runtime.map = config.map
        runtime.buildCatalog = config.buildings
        setMatchConfig(config)
        setScenarios(config.scenarios)
        appendLog('info', `Match config: ${config.scenario.id} (${config.buildings.length} buildings)`)
        rendererLifecycle.mount(config)
      },
      setScenarios
    })
    const connection = connectMatch(
      SERVER_URL,
      {
        type: 'match_request',
        scenarioId: SCENARIO,
        aggression: AGGRESSION,
        map: playtestMap === null ? { source: 'catalog' } : { source: 'local', definition: playtestMap }
      },
      handlers
    )
    connectionOwnerRef.current.set(connection)
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        cancelPlacement()
        commandModes.clear()
      }
    }
    const onWindowBlur = (): void => {
      cancelPlacement()
      commandModes.clear()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('blur', onWindowBlur)
    return () => {
      runtime.sessionActive = false
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('blur', onWindowBlur)
      connectionOwnerRef.current.cleanup(connection)
      rendererLifecycle.dispose()
      rendererRef.current = null
      runtimeRef.current = null
      delete window.__rtsDebug
    }
  }, [appendLog, hostRef, commandModes.modeRef, commandModes.clear])
  return {
    status,
    messageLog,
    unitCount,
    tick,
    selectionUnits,
    selectedConstruction,
    selectedMineral,
    resources,
    commandMode: commandModes.mode,
    matchResult,
    scenario: SCENARIO,
    scenarios: scenarios.map((scenario) => scenario.id),
    buildings: matchConfig?.buildings ?? [],
    aggression: AGGRESSION,
    spritesEnabled: SPRITES_ENABLED,
    inputProfile,
    buildHint,
    arm: commandModes.arm,
    issueOrder: (type) => {
      const unitIds = [...(runtimeRef.current?.selectedIds ?? [])]
      if (
        unitIds.length === 0 ||
        !connectionOwnerRef.current.send({ type, payload: { unitIds } }, matchEndedRef.current)
      ) {
        return
      }
    },
    surrender: () => {
      connectionOwnerRef.current.send({ type: 'SURRENDER', payload: {} }, matchEndedRef.current)
    },
    newMatch: () => window.location.reload(),
    changeScenario: (id) => {
      const params = new URLSearchParams(window.location.search)
      params.set('scenario', id)
      params.set('aggression', AGGRESSION)
      window.location.search = params.toString()
    },
    setAggression: (value) => {
      const params = new URLSearchParams(window.location.search)
      params.set('scenario', SCENARIO)
      params.set('aggression', value)
      window.location.search = params.toString()
    },
    setSpritesEnabled: (value) => {
      const params = new URLSearchParams(window.location.search)
      if (value) {
        params.delete('sprites')
      } else {
        params.set('sprites', 'off')
      }
      window.location.search = params.toString()
    },
    setInputProfile: (value) => {
      inputProfileRef.current = value
      setInputProfileState(value)
      writeInputPreferences(window.localStorage, { inputProfile: value })
      rendererRef.current?.setInputProfile(value)
    }
  }
}
