import { type GameRenderer, PixiRenderer } from '@rts/renderer'
import { useEffect, useRef, useState } from 'react'
import { connectMatch, type MatchConnection, type SnapshotMessage } from '../client/connection'

const WORLD_TILES = 192
const WORLD_UNITS = WORLD_TILES * 256
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'ws://localhost:8080'
const PLAYER_BASE_CENTER = { x: 2048, y: 2048 }

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

export function MatchScreen() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState('connecting')
  const [unitCount, setUnitCount] = useState(0)
  const [selectedCount, setSelectedCount] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    if (host === null) {
      return
    }

    const renderer: GameRenderer = new PixiRenderer({
      worldWidth: WORLD_UNITS,
      worldHeight: WORLD_UNITS,
      initialZoom: 1,
      initialCenter: PLAYER_BASE_CENTER
    })
    let selection = new Set<number>()
    let lastTick = 0

    const updateSelection = (ids: readonly number[]): void => {
      selection = new Set(ids)
      setSelectedCount(selection.size)
      renderer.setSelection(ids)
    }

    const applySnapshot = (message: SnapshotMessage): void => {
      lastTick = message.tick
      setUnitCount(message.units.length)
      const frame = {
        tick: message.tick,
        units: message.units.map((unit) => ({ id: unit.id, x: unit.x, y: unit.y, owner: unit.owner }))
      }
      renderer.present(frame)
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
            connection?.sendMove([...selection], Math.round(x), Math.round(y))
          }
        }
      })
      .then(() => {
        connection = connectMatch(SERVER_URL, {
          onSnapshot: applySnapshot,
          onOpen: () => setStatus('connected'),
          onError: (message) => setStatus(message)
        })
        window.__rtsDebug = {
          getPositions: () => {
            const out: Record<string, { readonly x: number; readonly y: number }> = {}
            for (const [id, pos] of renderer.getUnitPositions()) {
              out[String(id)] = pos
            }
            return out
          },
          getSelection: () => renderer.getSelection(),
          worldToScreen: (x, y) => renderer.worldToScreen(x, y),
          getZoom: () => renderer.getZoom(),
          getPing: () => renderer.getPing(),
          moveCamera: (x, y) => renderer.moveCamera(x, y),
          getTick: () => lastTick
        }
      })
      .catch((error: unknown) => {
        setStatus(`error: ${error instanceof Error ? error.message : String(error)}`)
      })

    return () => {
      connection?.close()
      renderer.dispose()
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
        status: {status} · units: {unitCount} · selected: {selectedCount}
      </div>
      <div ref={hostRef} style={{ flex: 1, minHeight: 0 }} />
    </div>
  )
}
