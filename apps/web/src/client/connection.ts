export interface SnapshotMessage {
  readonly type: 'snapshot'
  readonly tick: number
  readonly units: readonly { readonly id: number; readonly x: number; readonly y: number; readonly owner: number }[]
}

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
    try {
      const message = JSON.parse(String(event.data)) as SnapshotMessage
      if (message.type === 'snapshot') {
        handlers.onSnapshot(message)
      }
    } catch {
      // ignore malformed messages
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
