import {
  isErrorMessage,
  isMatchConfig,
  isSnapshotMessage,
  type MatchConfig,
  type MatchRequest,
  type SnapshotMessage
} from '@rts/protocol'
import type { CommandIntent } from '@rts/shared'

export type { SnapshotMessage }

export interface MatchConnection {
  sendCommand(intent: CommandIntent): void
  close(): void
}

export interface ConnectionHandlers {
  readonly onSnapshot: (message: SnapshotMessage) => void
  readonly onOpen?: () => void
  readonly onMatchConfig?: (config: MatchConfig) => void
  readonly onError?: (message: string) => void
}

export function connectMatch(url: string, request: MatchRequest, handlers: ConnectionHandlers): MatchConnection {
  const ws = new WebSocket(url)

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify(request))
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
    if (isMatchConfig(parsed)) {
      handlers.onMatchConfig?.(parsed)
    } else if (isSnapshotMessage(parsed)) {
      handlers.onSnapshot(parsed)
    } else if (isErrorMessage(parsed)) {
      handlers.onError?.(parsed.message)
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
    close() {
      ws.close()
    }
  }
}
