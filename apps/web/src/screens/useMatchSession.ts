import { createCompetitiveMap } from '@rts/game-data'
import { type GameRenderer, PixiRenderer } from '@rts/renderer'
import type { CommandIntent } from '@rts/shared'
import { fixedToRenderPixels, renderPixelsToFixed, TILE_PIXELS } from '@rts/shared'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { type ConnectionHandlers, connectMatch, type MatchConnection, type SnapshotMessage } from '../client/connection'
import { snapshotToFrame } from '../client/snapshot-to-frame'
import type { HudSelectionUnit } from '../hud/types'
import { type CommandMode, useCommandModes } from '../hud/useCommandModes'

const WORLD_TILES = 32
const WORLD_PX = WORLD_TILES * TILE_PIXELS
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'ws://localhost:8080'
const PLAYER_BASE_CENTER_FIXED = { x: 2048, y: 2048 }
const PLAYER_BASE_CENTER = {
  x: fixedToRenderPixels(PLAYER_BASE_CENTER_FIXED.x),
  y: fixedToRenderPixels(PLAYER_BASE_CENTER_FIXED.y)
}

interface RtsDebug {
  getPositions(): Record<string, { readonly x: number; readonly y: number }>
  getAnimationFrame(id: number): number | null
  getUnitHealth(id: number): { readonly current: number; readonly max: number } | null
  getSpriteState(id: number): {
    readonly visible: boolean
    readonly frame: number | null
    readonly anim: 'idle' | 'run' | 'attack' | 'fallback'
    readonly inTree: boolean
    readonly facing: number
  } | null
  getSelection(): readonly number[]
  worldToScreen(x: number, y: number): { readonly x: number; readonly y: number }
  getZoom(): number
  getPing(): { readonly x: number; readonly y: number } | null
  moveCamera(x: number, y: number): void
  getTick(): number
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
  readonly resources: {
    readonly mineral: number
    readonly energy: number
    readonly supply: number
    readonly supplyCap: number
  } | null
  readonly commandMode: CommandMode
  /** 'victory' | 'defeat' | 'draw' once the match is finished, else null. */
  readonly matchResult: 'victory' | 'defeat' | 'draw' | null
  arm(mode: Exclude<CommandMode, 'none'>): void
  issueOrder(
    type: 'STOP' | 'HOLD' | 'PATROL' | 'ATTACK_MOVE',
    target?: { readonly x: number; readonly y: number }
  ): void
  surrender(): void
  newMatch(): void
}

/** The human player is always the demo's player 0. */
const HUMAN_PLAYER = 0

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
  const [resources] = useState<MatchSessionState['resources']>(null)
  const [matchResult, setMatchResult] = useState<MatchSessionState['matchResult']>(null)
  const commandModes = useCommandModes()
  const connectionRef = useRef<MatchConnection | null>(null)
  const selectionRef = useRef<readonly number[]>([])

  useEffect(() => {
    const host = hostRef.current
    if (host === null) {
      return
    }

    const renderer: GameRenderer = new PixiRenderer({
      worldWidth: WORLD_PX,
      worldHeight: WORLD_PX,
      initialZoom: 1,
      initialCenter: PLAYER_BASE_CENTER,
      assetsUrl: '/assets',
      map: createCompetitiveMap()
    })
    let selection = new Set<number>()
    let lastTick = 0
    let matchEnded = false
    const unitKinds = new Map<number, { readonly kind: HudSelectionUnit['kind']; readonly owner: number }>()
    const unitOwners = new Map<number, number>()
    const unitPositions = new Map<number, { readonly x: number; readonly y: number }>()
    let prevFramePositions = new Map<number, { readonly x: number; readonly y: number }>()
    let connection: MatchConnection | null = null

    const updateSelection = (ids: readonly number[]): void => {
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
            moving: previous !== undefined && (previous.x !== current.x || previous.y !== current.y)
          })
        }
      }
      setSelectionUnits(units)
    }

    const sendCommand = (intent: CommandIntent): void => {
      if (connection !== null) {
        connection.sendCommand(intent)
      }
    }

    const groundCommand = (worldX: number, worldY: number): void => {
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

    const unitCommand = (id: number): void => {
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

    const handlers: ConnectionHandlers = {
      onSnapshot: (message: SnapshotMessage) => {
        lastTick = message.tick
        setTick(message.tick)
        setUnitCount(message.units.length)
        prevFramePositions = new Map(unitPositions)
        unitPositions.clear()
        unitOwners.clear()
        for (const unit of message.units) {
          unitKinds.set(unit.id, { kind: unit.kind ?? 'pawn', owner: unit.owner })
          unitOwners.set(unit.id, unit.owner)
          unitPositions.set(unit.id, { x: unit.x, y: unit.y })
        }
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
        onBoxSelected: (ids) => {
          updateSelection(ids)
        },
        onGroundCommand: groundCommand,
        onUnitCommand: unitCommand
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
          getAnimationFrame: (id) => renderer.getUnitAnimationFrame(id),
          getUnitHealth: (id) => renderer.getUnitHealth(id),
          getSpriteState: (id) => renderer.getUnitSpriteState(id),
          getSelection: () => renderer.getSelection(),
          worldToScreen: (x, y) => renderer.worldToScreen(fixedToRenderPixels(x), fixedToRenderPixels(y)),
          getZoom: () => renderer.getZoom(),
          getPing: () => renderer.getPing(),
          moveCamera: (x, y) => renderer.moveCamera(fixedToRenderPixels(x), fixedToRenderPixels(y)),
          getTick: () => lastTick
        }
      })
      .catch((error: unknown) => {
        setStatus(`error: ${error instanceof Error ? error.message : String(error)}`)
      })

    return () => {
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
    resources,
    commandMode: commandModes.mode,
    matchResult,
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
    }
  }
}
