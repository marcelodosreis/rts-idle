import { isSnapshotMessage, type SnapshotMessage } from '@rts/protocol'

export type { SnapshotMessage }

export interface MatchConnection {
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

  return {
    sendMove(unitIds, x, y) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'MOVE', unitIds, x, y }))
      }
    },
    close() {
      ws.close()
    }
  }
}
