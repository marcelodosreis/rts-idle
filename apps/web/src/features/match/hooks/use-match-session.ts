import {
  type BuildCatalogEntry,
  type MatchConfig,
  type MatchRequest,
  PROTOCOL_VERSION,
  type ScenarioSummary,
  type SnapshotBuilding
} from '@rts/protocol'
import type { GameRenderer, InputProfile } from '@rts/renderer'
import type { MapDefinition, MatchResult, ResearchType, TrainableUnitKind } from '@rts/shared'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { readPlaytestMap } from '../../../shared/config/playtest-map'
import { clearMatchResumeState } from '../../../shared/transport/connection'
import { type MatchReleaseOutcome, releaseMatch } from '../../../shared/transport/match-release'
import { readStoredMatchSession, saveMatchSession } from '../../../shared/transport/resume-token'
import { MATCH_SERVER_URL } from '../../../shared/transport/server-url'
import type { HudNotification } from '../lib/hud-notifications'
import { updateMatchQuery } from '../lib/match-query'
import { readInputPreferences, writeInputPreferences } from '../services/input-preferences'
import { createMatchSessionConnectionOwner } from '../services/match-session-connection'
import type { MatchSessionRuntime } from '../services/match-session-runtime'
import {
  type MatchSessionRefs,
  type MatchSessionSetters,
  type SessionResources,
  startMatchSession
} from '../services/match-session-start'
import type { HudConstruction, HudResource, HudSelectionUnit } from '../types/hud-types'
import type { MatchLaunch } from '../types/match-launch'
import { type CommandMode, useCommandModes } from './use-command-modes'
import { type MessageLogEntry, useMessageLog } from './use-message-log'

const HUMAN_PLAYER = 0

export interface MatchSessionState {
  readonly status: string
  readonly messageLog: readonly MessageLogEntry[]
  readonly unitCount: number
  readonly tick: number
  readonly selectionUnits: readonly HudSelectionUnit[]
  readonly selectedConstruction: HudConstruction | null
  readonly selectedResource: HudResource | null
  readonly resources: SessionResources | null
  readonly commandMode: CommandMode
  readonly matchResult: MatchResult | null
  readonly scenario: string
  readonly scenarios: readonly string[]
  readonly aggression: 'offensive' | 'passive'
  readonly spritesEnabled: boolean
  readonly inputProfile: InputProfile
  readonly buildHint: string | null
  readonly hudNotification: HudNotification | null
  readonly completedConstructions: readonly SnapshotBuilding[]
  readonly buildings: readonly BuildCatalogEntry[]
  readonly production: MatchConfig['production']
  readonly researchCatalog: MatchConfig['research']
  arm(mode: Exclude<CommandMode, 'idle'>): void
  issueOrder(type: 'STOP' | 'HOLD'): void
  cancelConstruction(buildingId: number): void
  cancelProduction(producerId: number, queueIndex: number): void
  upgradeCastle(castleId: number): void
  research(monasteryId: number, researchType: ResearchType): void
  cancelResearch(monasteryId: number, queueIndex: number): void
  train(unitKind: TrainableUnitKind): void
  surrender(): void
  newMatch(): void
  changeScenario(id: string): void
  setAggression(value: 'offensive' | 'passive'): void
  setSpritesEnabled(value: boolean): void
  setInputProfile(value: InputProfile): void
}

function useCompletedConstructionHistory(): {
  readonly value: readonly SnapshotBuilding[]
  readonly append: (constructions: readonly SnapshotBuilding[]) => void
} {
  const [value, setValue] = useState<readonly SnapshotBuilding[]>([])
  const append = useCallback((constructions: readonly SnapshotBuilding[]): void => {
    if (constructions.length > 0) {
      setValue((previous) => [...previous, ...constructions])
    }
  }, [])
  return { value, append }
}

function useSessionState(): {
  readonly values: {
    readonly status: string
    readonly messageLog: readonly MessageLogEntry[]
    readonly unitCount: number
    readonly tick: number
    readonly selectionUnits: readonly HudSelectionUnit[]
    readonly selectedConstruction: HudConstruction | null
    readonly selectedResource: HudResource | null
    readonly buildHint: string | null
    readonly hudNotification: HudNotification | null
    readonly completedConstructions: readonly SnapshotBuilding[]
    readonly resources: SessionResources | null
    readonly matchResult: MatchResult | null
    readonly inputProfile: InputProfile
    readonly matchConfig: MatchConfig | null
    readonly scenarios: readonly ScenarioSummary[]
  }
  readonly setters: MatchSessionSetters & { readonly setInputProfileState: (value: InputProfile) => void }
  readonly appendLog: (kind: 'command' | 'event' | 'info' | 'error', message: string) => void
} {
  const { messageLog, appendLog } = useMessageLog()
  const [status, setStatus] = useState('connecting')
  const [unitCount, setUnitCount] = useState(0)
  const [tick, setTick] = useState(0)
  const [selectionUnits, setSelectionUnits] = useState<readonly HudSelectionUnit[]>([])
  const [selectedConstruction, setSelectedConstruction] = useState<HudConstruction | null>(null)
  const [selectedResource, setSelectedResource] = useState<HudResource | null>(null)
  const [buildHint, setBuildHint] = useState<string | null>(null)
  const [hudNotification, setHudNotification] = useState<HudNotification | null>(null)
  const completedConstructions = useCompletedConstructionHistory()
  const [resources, setResources] = useState<SessionResources | null>(null)
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [matchConfig, setMatchConfig] = useState<MatchConfig | null>(null)
  const [scenarios, setScenarios] = useState<readonly ScenarioSummary[]>([])
  const [inputProfile, setInputProfileState] = useState<InputProfile>(
    () => readInputPreferences(window.localStorage).inputProfile
  )
  return {
    values: {
      status,
      messageLog,
      unitCount,
      tick,
      selectionUnits,
      selectedConstruction,
      selectedResource,
      buildHint,
      hudNotification,
      completedConstructions: completedConstructions.value,
      resources,
      matchResult,
      inputProfile,
      matchConfig,
      scenarios
    },
    setters: {
      setStatus,
      setUnitCount,
      setTick,
      setSelectionUnits,
      setSelectedConstruction,
      setSelectedResource,
      setBuildHint,
      setHudNotification,
      appendCompletedConstructions: completedConstructions.append,
      setResources,
      setMatchResult,
      setMatchConfig,
      setScenarios,
      setInputProfileState
    },
    appendLog
  }
}

function queryForLaunch(launch: MatchLaunch) {
  if (launch.kind === 'resume') {
    return {
      scenario: launch.session.request.scenarioId,
      aggression: launch.session.request.aggression,
      spritesEnabled: launch.session.spritesEnabled
    }
  }
  return launch.query
}

function requestForLaunch(launch: MatchLaunch, playtestMap: MapDefinition | null): MatchRequest {
  if (launch.kind === 'resume') {
    return { ...launch.session.request, resumeToken: launch.session.resumeToken }
  }
  return {
    type: 'match_request',
    protocolVersion: PROTOCOL_VERSION,
    scenarioId: launch.query.scenario,
    aggression: launch.query.aggression,
    map: playtestMap === null ? { source: 'catalog' } : { source: 'local', definition: playtestMap }
  }
}

function newMatchPath(launch: MatchLaunch, updates: Partial<ReturnType<typeof queryForLaunch>> = {}): string {
  const query = queryForLaunch(launch)
  const params = new URLSearchParams()
  params.set('new', '1')
  params.set('scenario', updates.scenario ?? query.scenario)
  params.set('aggression', updates.aggression ?? query.aggression)
  if (!(updates.spritesEnabled ?? query.spritesEnabled)) {
    params.set('sprites', 'off')
  }
  return `/match?${params.toString()}`
}

function replaceCurrentMatch(destination: string): void {
  const stored = readStoredMatchSession()
  const navigate = (outcome: MatchReleaseOutcome): void => {
    if (outcome === 'failed') {
      return
    }
    clearMatchResumeState()
    window.location.assign(destination)
  }
  if (stored === null) {
    clearMatchResumeState()
    window.location.assign(destination)
    return
  }
  void releaseMatch(MATCH_SERVER_URL, stored.resumeToken).then(navigate)
}

function useSessionConnection(
  hostRef: RefObject<HTMLDivElement | null>,
  commandModes: ReturnType<typeof useCommandModes>,
  state: ReturnType<typeof useSessionState>,
  launch: MatchLaunch
): { readonly refs: MatchSessionRefs; readonly setInputProfileState: (value: InputProfile) => void } {
  const connectionOwnerRef = useRef(createMatchSessionConnectionOwner())
  const runtimeRef = useRef<MatchSessionRuntime | null>(null)
  const rendererRef = useRef<GameRenderer | null>(null)
  const matchEndedRef = useRef(false)
  const inputProfileRef = useRef(state.values.inputProfile)
  const refs: MatchSessionRefs = { runtimeRef, rendererRef, matchEndedRef, connectionOwnerRef, inputProfileRef }
  const { modeRef, clear } = commandModes
  const { appendLog } = state
  const latest = useRef({ refs, setters: state.setters })
  latest.current = { refs, setters: state.setters }

  useEffect(() => {
    const host = hostRef.current
    if (host === null) {
      return
    }
    const playtestMap =
      launch.kind === 'resume' && launch.session.request.map.source === 'local'
        ? launch.session.request.map.definition
        : readPlaytestMap(window.location.search, window.localStorage)
    const request = requestForLaunch(launch, playtestMap)
    return startMatchSession({
      host,
      playtestMap,
      request,
      commandModes: { modeRef, clear },
      refs: latest.current.refs,
      setters: latest.current.setters,
      serverUrl: MATCH_SERVER_URL,
      spritesEnabled: queryForLaunch(launch).spritesEnabled,
      humanPlayer: HUMAN_PLAYER,
      appendLog,
      onResumeUnavailable: () => window.location.assign('/?notice=match-expired')
    })
  }, [appendLog, hostRef, modeRef, clear, launch])

  return { refs, setInputProfileState: state.setters.setInputProfileState }
}

function useSessionActions(
  refs: MatchSessionRefs,
  setInputProfileState: (value: InputProfile) => void,
  launch: MatchLaunch
): Pick<
  MatchSessionState,
  | 'issueOrder'
  | 'surrender'
  | 'cancelConstruction'
  | 'cancelProduction'
  | 'upgradeCastle'
  | 'research'
  | 'cancelResearch'
  | 'train'
  | 'newMatch'
  | 'changeScenario'
  | 'setAggression'
  | 'setSpritesEnabled'
  | 'setInputProfile'
> {
  const owner = (): ReturnType<typeof createMatchSessionConnectionOwner> => refs.connectionOwnerRef.current
  const ended = (): boolean => refs.matchEndedRef.current
  return {
    issueOrder: (type) => {
      const unitIds = [...(refs.runtimeRef.current?.selectedIds ?? [])]
      if (unitIds.length === 0) {
        return
      }
      owner().send({ type, payload: { unitIds } }, ended())
    },
    surrender: () => {
      owner().send({ type: 'SURRENDER', payload: {} }, ended())
    },
    cancelConstruction: (buildingId) => {
      owner().send({ type: 'CANCEL_CONSTRUCTION', payload: { buildingId } }, ended())
    },
    cancelProduction: (producerId, queueIndex) => {
      owner().send({ type: 'CANCEL_PRODUCTION', payload: { producerId, queueIndex } }, ended())
    },
    upgradeCastle: (castleId) => {
      owner().send({ type: 'UPGRADE_CASTLE', payload: { castleId } }, ended())
    },
    research: (monasteryId, researchType) => {
      owner().send({ type: 'RESEARCH', payload: { monasteryId, researchType } }, ended())
    },
    cancelResearch: (monasteryId, queueIndex) => {
      owner().send({ type: 'CANCEL_RESEARCH', payload: { monasteryId, queueIndex } }, ended())
    },
    train: (unitKind) => {
      const producerId = refs.runtimeRef.current?.selectedConstructionId
      if (producerId === null || producerId === undefined) {
        return
      }
      owner().send({ type: 'TRAIN', payload: { producerId, unitKind } }, ended())
    },
    newMatch: () => replaceCurrentMatch(newMatchPath(launch)),
    changeScenario: (id) => replaceCurrentMatch(newMatchPath(launch, { scenario: id })),
    setAggression: (value) => replaceCurrentMatch(newMatchPath(launch, { aggression: value })),
    setSpritesEnabled: (value) => {
      const stored = readStoredMatchSession()
      if (stored !== null) {
        saveMatchSession({ ...stored, spritesEnabled: value })
      }
      window.location.search = updateMatchQuery(window.location.search, { spritesEnabled: value })
    },
    setInputProfile: (value) => {
      refs.inputProfileRef.current = value
      setInputProfileState(value)
      writeInputPreferences(window.localStorage, { inputProfile: value })
      refs.rendererRef.current?.setInputProfile(value)
    }
  }
}

function useHudNotificationTimeout(
  notification: HudNotification | null,
  setNotification: (notification: HudNotification | null) => void
): void {
  useEffect(() => {
    if (notification === null) {
      return
    }
    const timeout = window.setTimeout(() => setNotification(null), 2500)
    return () => window.clearTimeout(timeout)
  }, [notification, setNotification])
}

export function useMatchSession(hostRef: RefObject<HTMLDivElement | null>, launch: MatchLaunch): MatchSessionState {
  const commandModes = useCommandModes()
  const state = useSessionState()
  const { refs, setInputProfileState } = useSessionConnection(hostRef, commandModes, state, launch)
  const actions = useSessionActions(refs, setInputProfileState, launch)
  useHudNotificationTimeout(state.values.hudNotification, state.setters.setHudNotification)
  return {
    ...state.values,
    commandMode: commandModes.mode,
    scenario: queryForLaunch(launch).scenario,
    scenarios: state.values.scenarios.map((scenario) => scenario.id),
    buildings: state.values.matchConfig?.buildings ?? [],
    production: state.values.matchConfig?.production ?? [],
    researchCatalog: state.values.matchConfig?.research ?? [],
    aggression: queryForLaunch(launch).aggression,
    spritesEnabled: queryForLaunch(launch).spritesEnabled,
    arm: commandModes.arm,
    ...actions
  }
}
