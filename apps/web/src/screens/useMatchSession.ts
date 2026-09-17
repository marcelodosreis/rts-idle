import { type GameRenderer, PixiRenderer } from '@rts/renderer'
import { fixedToRenderPixels, renderPixelsToFixed, TILE_PIXELS } from '@rts/shared'
import { type RefObject, useEffect, useState } from 'react'
import { type ConnectionHandlers, connectMatch, type MatchConnection, type SnapshotMessage } from '../client/connection'
import { snapshotToFrame } from '../client/snapshot-to-frame'

const WORLD_TILES = 192
const WORLD_PX = WORLD_TILES * TILE_PIXELS
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'ws://localhost:8080'
const PLAYER_BASE_CENTER_FIXED = { x: 2048, y: 2048 }
const PLAYER_BASE_CENTER = {
  x: fixedToRenderPixels(PLAYER_BASE_CENTER_FIXED.x),
  y: fixedToRenderPixels(PLAYER_BASE_CENTER_FIXED.y)
}

interface RtsDebug {
  getPositions(): Record<string, { readonly x: number; readonly y: number }>
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
      assetsUrl: '/assets'
    })
    let selection = new Set<number>()
    let lastTick = 0

    const updateSelection = (ids: readonly number[]): void => {
      selection = new Set(ids)
      setSelectedCount(selection.size)
      renderer.setSelection(ids)
    }

    const handlers: ConnectionHandlers = {
      onSnapshot: (message: SnapshotMessage) => {
        lastTick = message.tick
        setUnitCount(message.units.length)
        renderer.present(snapshotToFrame(message))
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

  return { status, unitCount, selectedCount }
}
