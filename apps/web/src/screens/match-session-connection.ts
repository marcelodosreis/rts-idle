import type { CommandIntent } from '@rts/shared'
import type { MatchConnection } from '../client/connection'

export interface MatchSessionConnectionOwner {
  current(): MatchConnection | null
  set(connection: MatchConnection | null): void
  send(intent: CommandIntent, matchEnded: boolean): boolean
  cleanup(connection: MatchConnection | null): void
}

export function createMatchSessionConnectionOwner(): MatchSessionConnectionOwner {
  let owned: MatchConnection | null = null
  const closed = new Set<MatchConnection>()
  return {
    current: () => owned,
    set: (connection) => {
      owned = connection
    },
    send: (intent, matchEnded) => {
      if (matchEnded || owned === null) {
        return false
      }
      owned.sendCommand(intent)
      return true
    },
    cleanup: (connection) => {
      if (connection === null || owned !== connection) {
        return
      }
      owned = null
      if (!closed.has(connection)) {
        closed.add(connection)
        connection.close()
      }
    }
  }
}
