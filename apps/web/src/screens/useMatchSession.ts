import { createCompetitiveMap } from '@rts/game-data'
import { type GameRenderer, PixiRenderer } from '@rts/renderer'
import { fixedToRenderPixels, renderPixelsToFixed, TILE_PIXELS } from '@rts/shared'
import { type RefObject, useEffect, useState } from 'react'
import { type ConnectionHandlers, connectMatch, type MatchConnection, type SnapshotMessage } from '../client/connection'
import { snapshotToFrame } from '../client/snapshot-to-frame'
import type { HudSelectionUnit } from '../hud/types'

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
  getSpriteState(id: number): {
    readonly visible: boolean
    readonly frame: number | null
    readonly anim: 'idle' | 'run' | 'fallback'
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
}

/**
 * Owns the match screen lifecycle: renderer mount, server connection, snapshot
 * presentation, selection state, and the `__rtsDebug` test hook. The debug API
 * is exposed for E2E assertions only and is removed on unmount.
 */
export function useMatchSession(hostRef: RefObject<HTMLDivElement | null>): MatchSessionState {
  const [status, setStatus] = useState('connecting')
  const [unitCount, setUnitCount] = useState(0)
  const [selectedCount, setSelectedCount] = useState(0)
  const [tick, setTick] = useState(0)
  const [selectionUnits, setSelectionUnits] = useState<readonly HudSelectionUnit[]>([])
  const [resources] = useState<MatchSessionState['resources']>(null)

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
    const unitKinds = new Map<number, { readonly kind: HudSelectionUnit['kind']; readonly owner: number }>()
    const unitPositions = new Map<number, { readonly x: number; readonly y: number }>()
    let prevFramePositions = new Map<number, { readonly x: number; readonly y: number }>()

    const updateSelection = (ids: readonly number[]): void => {
      selection = new Set(ids)
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

    const handlers: ConnectionHandlers = {
      onSnapshot: (message: SnapshotMessage) => {
        lastTick = message.tick
        setTick(message.tick)
        setUnitCount(message.units.length)
        prevFramePositions = new Map(unitPositions)
        unitPositions.clear()
        for (const unit of message.units) {
          // The protocol no longer carries a unit kind; the demo units are pawns.
          unitKinds.set(unit.id, { kind: 'pawn', owner: unit.owner })
          unitPositions.set(unit.id, { x: unit.x, y: unit.y })
        }
        renderer.present(snapshotToFrame(message))
        if (selection.size > 0) {
          updateSelection([...selection])
        }
      },
      onOpen: () => setStatus('connected'),
      onError: (message) => setStatus(message)
    }

    let connection: MatchConnection | null = null

    void renderer
      .mount(host, {
        onUnitSelected: (id) => {
          updateSelection([id])
        },
        onBoxSelected: (ids) => {
          updateSelection(ids)
        },
        onGroundCommand: (x, y) => {
          if (selection.size > 0) {
            connection?.sendMove([...selection], Math.round(renderPixelsToFixed(x)), Math.round(renderPixelsToFixed(y)))
          }
        }
      })
      .then(() => {
        connection = connectMatch(SERVER_URL, handlers)
        window.__rtsDebug = {
          getPositions: () => {
            const out: Record<string, { readonly x: number; readonly y: number }> = {}
            for (const [id, pos] of renderer.getUnitPositions()) {
              out[String(id)] = pos
            }
            return out
          },
          getAnimationFrame: (id) => renderer.getUnitAnimationFrame(id),
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
      renderer.dispose()
      delete window.__rtsDebug
    }
  }, [hostRef])

  return { status, unitCount, selectedCount, tick, selectionUnits, resources }
}
