import { isSnapshotMessage, type SnapshotMessage } from '@rts/protocol'
import type { CommandIntent } from '@rts/shared'

export type { SnapshotMessage }

export interface MatchConnection {
  sendCommand(intent: CommandIntent): void
  sendMove(unitIds: readonly number[], x: number, y: number): void
  close(): void
}

export interface ConnectionHandlers {
  readonly onSnapshot: (message: SnapshotMessage) => void
  readonly onOpen?: () => void
  readonly onError?: (message: string) => void
}

export function connectMatch(url: string, handlers: ConnectionHandlers): MatchConnection {
  const ws = new WebSocket(url)

  ws.addEventListener('open', () => {
    handlers.onOpen?.()
  })
  ws.addEventListener('error', () => {
    handlers.onError?.(`failed to connect to ${url}`)
  })
  ws.addEventListener('message', (event) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(String(event.data))
    } catch {
      return // ignore malformed messages
    }
    if (isSnapshotMessage(parsed)) {
      handlers.onSnapshot(parsed)
    }
  })

  const send = (payload: string): void => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload)
    }
  }

  return {
    sendCommand(intent) {
      send(JSON.stringify({ type: 'command', intent }))
    },
    sendMove(unitIds, x, y) {
      send(JSON.stringify({ type: 'MOVE', unitIds, x, y }))
    },
    close() {
      ws.close()
    }
  }
}
