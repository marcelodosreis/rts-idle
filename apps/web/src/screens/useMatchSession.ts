import { BUILDING_DEFINITIONS, createCompetitiveMap, tileAtPosition } from '@rts/game-data'
import { type GameRenderer, PixiRenderer } from '@rts/renderer'
import type { CommandIntent } from '@rts/shared'
import { FIXED_SCALE, fixedToRenderPixels, renderPixelsToFixed, TILE_PIXELS, tilesToFixed } from '@rts/shared'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { type ConnectionHandlers, connectMatch, type MatchConnection, type SnapshotMessage } from '../client/connection'
import { snapshotToFrame } from '../client/snapshot-to-frame'
import type { HudConstruction, HudMineral, HudSelectionUnit } from '../hud/types'
import { type CommandMode, useCommandModes } from '../hud/useCommandModes'
import { readPlaytestMap } from './playtest-map'

const DEMO_SCENARIO_IDS = ['6v6', 'economy', '4v4', 'ffa', 'win', 'defeat'] as const
const SCENARIO = (new URLSearchParams(window.location.search).get('scenario') ??
  '6v6') as (typeof DEMO_SCENARIO_IDS)[number]
const AGGRESSION = (new URLSearchParams(window.location.search).get('aggression') ?? 'offensive') as
  | 'offensive'
  | 'passive'
const SPRITES_ENABLED = new URLSearchParams(window.location.search).get('sprites') !== 'off'
const SERVER_URL = `${import.meta.env.VITE_SERVER_URL ?? 'ws://localhost:8080'}?scenario=${SCENARIO}&aggression=${AGGRESSION}`
const PLAYER_BASE_CENTER_FIXED = { x: 2048, y: 2048 }
const PLAYER_BASE_CENTER = {
  x: fixedToRenderPixels(PLAYER_BASE_CENTER_FIXED.x),
  y: fixedToRenderPixels(PLAYER_BASE_CENTER_FIXED.y)
}

interface RtsDebug {
  getPositions(): Record<string, { readonly x: number; readonly y: number }>
  getUnitOwners(): Record<string, number>
  getConstructionStates(): Record<string, { readonly x: number; readonly y: number; readonly status: string }>
  getAnimationFrame(id: number): number | null
  getUnitHealth(id: number): { readonly current: number; readonly max: number } | null
  getSpriteState(id: number): {
    readonly visible: boolean
    readonly frame: number | null
    readonly anim: 'idle' | 'run' | 'attack' | 'gather' | 'carry_idle' | 'carry_run' | 'fallback'
    readonly inTree: boolean
    readonly facing: number
    readonly scale: number
    readonly glyph: string | null
    readonly shape: 'circle' | 'square' | 'triangle' | null
  } | null
  getSelection(): readonly number[]
  setSelection(ids: readonly number[]): void
  worldToScreen(x: number, y: number): { readonly x: number; readonly y: number }
  getZoom(): number
  getPing(): { readonly x: number; readonly y: number } | null
  moveCamera(x: number, y: number): void
  getTick(): number
  getMapInfo(): {
    readonly width: number
    readonly height: number
    readonly decorations: number
    readonly isPlaytest: boolean
  }
}

declare global {
  interface Window {
    __rtsDebug?: RtsDebug
  }
}

export interface MatchSessionState {
  readonly status: string
  readonly unitCount: number
  readonly selectedCount: number
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
  /** 'victory' | 'defeat' | 'draw' once the match is finished, else null. */
  readonly matchResult: 'victory' | 'defeat' | 'draw' | null
  readonly scenario: string
  readonly scenarios: readonly string[]
  readonly aggression: 'offensive' | 'passive'
  readonly spritesEnabled: boolean
  readonly buildHint: string | null
  arm(mode: Exclude<CommandMode, 'none'>): void
  issueOrder(
    type: 'STOP' | 'HOLD' | 'PATROL' | 'ATTACK_MOVE',
    target?: { readonly x: number; readonly y: number }
  ): void
  surrender(): void
  newMatch(): void
  changeScenario(id: string): void
  setAggression(value: 'offensive' | 'passive'): void
  setSpritesEnabled(value: boolean): void
}

/** The human player is always the demo's player 0. */
const HUMAN_PLAYER = 0

function resourcesForHuman(message: SnapshotMessage): MatchSessionState['resources'] {
  const humanPlayer = message.players.find((player) => player.id === HUMAN_PLAYER)
  if (humanPlayer === undefined) {
    return null
  }
  return { mineral: humanPlayer.gold, energy: 0, supply: 0, supplyCap: 0 }
}

function unitForHud(unit: SnapshotMessage['units'][number]): Omit<HudSelectionUnit, 'id' | 'moving'> {
  return {
    kind: unit.kind ?? 'pawn',
    owner: unit.owner,
    ...(unit.orderState === undefined ? {} : { orderState: unit.orderState }),
    ...(unit.hp === undefined ? {} : { hp: unit.hp, maxHp: unit.maxHp }),
    ...(unit.economy === undefined ? {} : { economy: unit.economy })
  }
}

/**
 * Owns the match screen lifecycle: renderer mount, server connection, snapshot
 * presentation, selection state, command dispatch, and the match result. The
 * `__rtsDebug` hook is exposed for E2E assertions only and is removed on
 * unmount.
 */
export function useMatchSession(hostRef: RefObject<HTMLDivElement | null>): MatchSessionState {
  const [status, setStatus] = useState('connecting')
  const [unitCount, setUnitCount] = useState(0)
  const [selectedCount, setSelectedCount] = useState(0)
  const [tick, setTick] = useState(0)
  const [selectionUnits, setSelectionUnits] = useState<readonly HudSelectionUnit[]>([])
  const [selectedConstruction, setSelectedConstruction] = useState<HudConstruction | null>(null)
  const [selectedMineral, setSelectedMineral] = useState<HudMineral | null>(null)
  const [buildHint, setBuildHint] = useState<string | null>(null)
  const [resources, setResources] = useState<MatchSessionState['resources']>(null)
  const [matchResult, setMatchResult] = useState<MatchSessionState['matchResult']>(null)
  const commandModes = useCommandModes()
  const connectionRef = useRef<MatchConnection | null>(null)
  const selectionRef = useRef<readonly number[]>([])

  useEffect(() => {
    const host = hostRef.current
    if (host === null) {
      return
    }

    const playtestMap = readPlaytestMap(window.location.search, window.localStorage)
    const map = playtestMap ?? createCompetitiveMap()
    const renderer: GameRenderer = new PixiRenderer({
      worldWidth: map.width * TILE_PIXELS,
      worldHeight: map.height * TILE_PIXELS,
      initialZoom: 1,
      initialCenter: PLAYER_BASE_CENTER,
      assetsUrl: SPRITES_ENABLED ? '/assets' : '',
      map
    })
    let selection = new Set<number>()
    let lastTick = 0
    let matchEnded = false
    const unitKinds = new Map<
      number,
      {
        readonly kind: HudSelectionUnit['kind']
        readonly owner: number
        readonly hp?: number
        readonly maxHp?: number
        readonly economy?: HudSelectionUnit['economy']
        readonly orderState?: HudSelectionUnit['orderState']
      }
    >()
    const unitOwners = new Map<number, number>()
    const unitPositions = new Map<number, { readonly x: number; readonly y: number }>()
    let prevFramePositions = new Map<number, { readonly x: number; readonly y: number }>()
    let buildings: SnapshotMessage['buildings'] = []
    let mineralNodes: SnapshotMessage['mineralNodes'] = []
    let selectedConstructionId: number | null = null
    let selectedMineralId: number | null = null
    let connection: MatchConnection | null = null

    const placementFor = (worldX: number, worldY: number) => {
      const mode = commandModes.modeRef.current
      if (mode !== 'build_base' && mode !== 'build_barracks') {
        return null
      }
      const buildingType = mode === 'build_base' ? 'BASE' : 'BARRACKS'
      const footprint = BUILDING_DEFINITIONS[buildingType].footprint
      const { width, height } = footprint
      const x = Math.floor(renderPixelsToFixed(worldX) / FIXED_SCALE)
      const y = Math.floor(renderPixelsToFixed(worldY) / FIXED_SCALE)
      let reason: string | null = null
      let valid = x >= 0 && y >= 0 && x + width <= map.width && y + height <= map.height
      if (!valid) {
        reason = 'Outside the map.'
      }
      for (let row = y; valid && row < y + height; row += 1) {
        for (let column = x; column < x + width; column += 1) {
          const tile = tileAtPosition(map, column, row)
          if (tile !== 'land' && tile !== 'elevated') {
            valid = false
            reason = 'This terrain cannot support construction.'
          }
        }
      }
      if (
        buildings.some((construction) => {
          const cx = construction.x / FIXED_SCALE
          const cy = construction.y / FIXED_SCALE
          return (
            x < cx + construction.footprint.width &&
            x + width > cx &&
            y < cy + construction.footprint.height &&
            y + height > cy
          )
        })
      ) {
        valid = false
        reason = 'Location is occupied.'
      }
      return { x: tilesToFixed(x), y: tilesToFixed(y), width, height, valid, reason }
    }

    const updatePreview = (worldX: number, worldY: number): void => {
      const placement = placementFor(worldX, worldY)
      renderer.setBuildPreview(placement)
      setBuildHint(placement?.valid ? 'Valid location — click to build.' : (placement?.reason ?? null))
    }

    const cancelPlacement = (): void => {
      if (commandModes.modeRef.current === 'build_base' || commandModes.modeRef.current === 'build_barracks') {
        commandModes.clear()
        renderer.setBuildPreview(null)
        setBuildHint(null)
      }
    }

    const updateSelection = (ids: readonly number[]): void => {
      selectedConstructionId = null
      setSelectedConstruction(null)
      selectedMineralId = null
      setSelectedMineral(null)
      selection = new Set(ids)
      selectionRef.current = [...ids]
      setSelectedCount(selection.size)
      renderer.setSelection(ids)
      const units: HudSelectionUnit[] = []
      for (const id of [...selection].sort((a, b) => a - b)) {
        const kind = unitKinds.get(id)
        const current = unitPositions.get(id)
        const previous = prevFramePositions.get(id)
        if (kind !== undefined && current !== undefined) {
          units.push({
            id,
            kind: kind.kind,
            owner: kind.owner,
            moving: previous !== undefined && (previous.x !== current.x || previous.y !== current.y),
            ...(kind.hp === undefined ? {} : { hp: kind.hp, maxHp: kind.maxHp }),
            ...(kind.orderState === undefined ? {} : { orderState: kind.orderState }),
            ...(kind.economy === undefined ? {} : { economy: kind.economy })
          })
        }
      }
      setSelectionUnits(units)
    }

    const updateConstructionSelection = (id: number): void => {
      selectedMineralId = null
      setSelectedMineral(null)
      const construction = buildings.find((candidate) => candidate.id === id)
      if (construction === undefined || construction.owner !== HUMAN_PLAYER) {
        selectedConstructionId = null
        setSelectedConstruction(null)
        return
      }
      selectedConstructionId = id
      selection.clear()
      selectionRef.current = []
      setSelectedCount(0)
      setSelectionUnits([])
      renderer.setSelection([])
      setSelectedConstruction({
        id: construction.id,
        buildingType: construction.buildingType,
        owner: construction.owner,
        status: construction.status !== 'COMPLETED' && construction.builderId == null ? 'PAUSED' : construction.status,
        progressTicks: construction.progressTicks,
        totalTicks: construction.totalTicks,
        builderId: construction.builderId ?? null
      })
    }

    const updateMineralSelection = (id: number): void => {
      const node = mineralNodes.find((candidate) => candidate.id === id)
      if (node === undefined) {
        selectedMineralId = null
        setSelectedMineral(null)
        return
      }
      selectedMineralId = id
      setSelectedConstruction(null)
      selectedConstructionId = null
      selection.clear()
      selectionRef.current = []
      setSelectedCount(0)
      setSelectionUnits([])
      renderer.setSelection([])
      setSelectedMineral({ id: node.id, remaining: node.remaining })
    }

    const sendCommand = (intent: CommandIntent): void => {
      if (connection !== null) {
        connection.sendCommand(intent)
      }
    }

    const groundCommand = (worldX: number, worldY: number): void => {
      if (commandModes.modeRef.current === 'build_base' || commandModes.modeRef.current === 'build_barracks') {
        cancelPlacement()
        return
      }
      if (selection.size === 0) {
        return
      }
      const x = Math.round(renderPixelsToFixed(worldX))
      const y = Math.round(renderPixelsToFixed(worldY))
      const unitIds = [...selection]
      const mode = commandModes.modeRef.current
      if (mode === 'patrol') {
        sendCommand({ type: 'PATROL', payload: { unitIds, x, y } })
        commandModes.clear()
      } else if (mode === 'attack_move') {
        sendCommand({ type: 'ATTACK_MOVE', payload: { unitIds, x, y } })
        commandModes.clear()
      } else {
        sendCommand({ type: 'MOVE', payload: { unitIds, x, y } })
      }
    }

    const groundClick = (worldX: number, worldY: number): boolean => {
      const mode = commandModes.modeRef.current
      if (mode !== 'build_base' && mode !== 'build_barracks') {
        return false
      }
      const placement = placementFor(worldX, worldY)
      const workerId = [...selection].find((id) => {
        const unit = unitKinds.get(id)
        return unit?.kind === 'pawn' && unit.owner === HUMAN_PLAYER
      })
      if (placement?.valid && workerId !== undefined) {
        sendCommand({
          type: 'BUILD',
          payload: {
            unitId: workerId,
            buildingType: mode === 'build_base' ? 'BASE' : 'BARRACKS',
            x: placement.x / FIXED_SCALE,
            y: placement.y / FIXED_SCALE
          }
        })
        cancelPlacement()
      }
      if (placement !== null && !placement.valid) {
        setBuildHint(placement.reason)
      }
      return true
    }

    const unitCommand = (id: number): void => {
      if (commandModes.modeRef.current === 'build_base' || commandModes.modeRef.current === 'build_barracks') {
        cancelPlacement()
        return
      }
      if (selection.size === 0) {
        return
      }
      const mode = commandModes.modeRef.current
      const isEnemy = (unitOwners.get(id) ?? 0) !== HUMAN_PLAYER
      if (mode === 'attack' || isEnemy) {
        sendCommand({ type: 'ATTACK', payload: { unitIds: [...selection], targetId: id } })
        commandModes.clear()
      }
      // Right-click on a friendly unit with no armed order does nothing.
    }

    const constructionCommand = (id: number): void => {
      const construction = buildings.find((candidate) => candidate.id === id)
      const workerId = [...selection].find((selectedId) => {
        const unit = unitKinds.get(selectedId)
        return unit?.kind === 'pawn' && unit.owner === HUMAN_PLAYER
      })
      if (construction === undefined || workerId === undefined || construction.status === 'COMPLETED') {
        return
      }
      sendCommand({
        type: 'BUILD',
        payload: {
          unitId: workerId,
          buildingType: construction.buildingType,
          x: construction.x / FIXED_SCALE,
          y: construction.y / FIXED_SCALE
        }
      })
    }

    const handlers: ConnectionHandlers = {
      onSnapshot: (message: SnapshotMessage) => {
        lastTick = message.tick
        buildings = message.buildings
        mineralNodes = message.mineralNodes
        if (selectedConstructionId !== null) {
          updateConstructionSelection(selectedConstructionId)
        }
        if (selectedMineralId !== null) {
          const selectedNode = mineralNodes.find((node) => node.id === selectedMineralId)
          if (selectedNode === undefined) {
            selectedMineralId = null
            setSelectedMineral(null)
          } else {
            setSelectedMineral({ id: selectedNode.id, remaining: selectedNode.remaining })
          }
        }
        setTick(message.tick)
        setUnitCount(message.units.length)
        prevFramePositions = new Map(unitPositions)
        unitPositions.clear()
        unitOwners.clear()
        for (const unit of message.units) {
          unitKinds.set(unit.id, unitForHud(unit))
          unitOwners.set(unit.id, unit.owner)
          unitPositions.set(unit.id, { x: unit.x, y: unit.y })
        }
        setResources(resourcesForHuman(message))
        if (!matchEnded && message.phase === 'FINISHED') {
          matchEnded = true
          const active = message.players.filter((player) => !player.defeated)
          if (active.length === 1) {
            setMatchResult(active[0]!.id === HUMAN_PLAYER ? 'victory' : 'defeat')
          } else {
            setMatchResult('draw')
          }
        }
        renderer.present(snapshotToFrame(message))
        if (selection.size > 0) {
          updateSelection([...selection])
        }
      },
      onOpen: () => setStatus('connected'),
      onError: (message) => setStatus(message)
    }

    void renderer
      .mount(host, {
        onUnitSelected: (id) => {
          updateSelection([id])
        },
        onBuildingSelected: updateConstructionSelection,
        onMineralSelected: updateMineralSelection,
        onBoxSelected: (ids) => {
          updateSelection(ids)
        },
        onGroundCommand: groundCommand,
        onGroundClick: groundClick,
        onGroundMove: updatePreview,
        onUnitCommand: unitCommand,
        onBuildingCommand: constructionCommand,
        onMineralCommand: (nodeId) => {
          if (commandModes.modeRef.current === 'build_base' || commandModes.modeRef.current === 'build_barracks') {
            cancelPlacement()
            return
          }
          if (selection.size === 0) {
            return
          }
          sendCommand({ type: 'GATHER', payload: { unitIds: [...selection], nodeId } })
          commandModes.clear()
        }
      })
      .then(() => {
        connection = connectMatch(SERVER_URL, handlers)
        connectionRef.current = connection
        window.__rtsDebug = {
          getPositions: () => {
            const out: Record<string, { readonly x: number; readonly y: number }> = {}
            for (const [id, pos] of renderer.getUnitPositions()) {
              out[String(id)] = pos
            }
            return out
          },
          getUnitOwners: () => {
            const out: Record<string, number> = {}
            for (const [id, owner] of unitOwners) {
              out[String(id)] = owner
            }
            return out
          },
          getConstructionStates: () => {
            const out: Record<string, { readonly x: number; readonly y: number; readonly status: string }> = {}
            for (const construction of buildings) {
              out[String(construction.id)] = {
                x: construction.x,
                y: construction.y,
                status: construction.status
              }
            }
            return out
          },
          getAnimationFrame: (id) => renderer.getUnitAnimationFrame(id),
          getUnitHealth: (id) => renderer.getUnitHealth(id),
          getSpriteState: (id) => renderer.getUnitSpriteState(id),
          getSelection: () => renderer.getSelection(),
          setSelection: (ids) => updateSelection(ids),
          worldToScreen: (x, y) => renderer.worldToScreen(fixedToRenderPixels(x), fixedToRenderPixels(y)),
          getZoom: () => renderer.getZoom(),
          getPing: () => renderer.getPing(),
          moveCamera: (x, y) => renderer.moveCamera(fixedToRenderPixels(x), fixedToRenderPixels(y)),
          getTick: () => lastTick,
          getMapInfo: () => ({
            width: map.width,
            height: map.height,
            decorations: map.decorations?.length ?? 0,
            isPlaytest: playtestMap !== null
          })
        }
      })
      .catch((error: unknown) => {
        setStatus(`error: ${error instanceof Error ? error.message : String(error)}`)
      })

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        cancelPlacement()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      connection?.close()
      connectionRef.current = null
      renderer.dispose()
      delete window.__rtsDebug
    }
  }, [hostRef, commandModes.modeRef, commandModes.clear])

  return {
    status,
    unitCount,
    selectedCount,
    tick,
    selectionUnits,
    selectedConstruction,
    selectedMineral,
    resources,
    commandMode: commandModes.mode,
    matchResult,
    scenario: SCENARIO,
    scenarios: DEMO_SCENARIO_IDS,
    aggression: AGGRESSION,
    spritesEnabled: SPRITES_ENABLED,
    buildHint,
    arm: commandModes.arm,
    issueOrder: (type, target) => {
      const connection = connectionRef.current
      const unitIds = [...selectionRef.current]
      if (connection === null || unitIds.length === 0) {
        return
      }
      if (type === 'STOP' || type === 'HOLD') {
        connection.sendCommand({ type, payload: { unitIds } })
        return
      }
      if (target === undefined) {
        return
      }
      const x = Math.round(renderPixelsToFixed(target.x))
      const y = Math.round(renderPixelsToFixed(target.y))
      if (type === 'PATROL') {
        connection.sendCommand({ type: 'PATROL', payload: { unitIds, x, y } })
      } else if (type === 'ATTACK_MOVE') {
        connection.sendCommand({ type: 'ATTACK_MOVE', payload: { unitIds, x, y } })
      }
    },
    surrender: () => {
      const connection = connectionRef.current
      if (connection !== null) {
        connection.sendCommand({ type: 'SURRENDER', payload: {} })
      }
    },
    newMatch: () => {
      window.location.reload()
    },
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
    }
  }
}
