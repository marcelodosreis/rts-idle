import { useCallback, useState } from 'react'

export const MESSAGE_LOG_KINDS = ['info', 'error', 'command', 'event'] as const

export type MessageLogKind = (typeof MESSAGE_LOG_KINDS)[number]

export interface MessageLogEntry {
  readonly timestamp: number
  readonly type: MessageLogKind
  readonly message: string
}

const MAX_MESSAGE_LOG = 50

export function useMessageLog(): {
  readonly messageLog: readonly MessageLogEntry[]
  readonly appendLog: (type: MessageLogKind, message: string) => void
} {
  const [messageLog, setMessageLog] = useState<readonly MessageLogEntry[]>([])

  const appendLog = useCallback((type: MessageLogKind, message: string): void => {
    setMessageLog((prev) => {
      const entry: MessageLogEntry = { timestamp: Date.now(), type, message }
      const next = [entry, ...prev]
      return next.length > MAX_MESSAGE_LOG ? next.slice(0, MAX_MESSAGE_LOG) : next
    })
  }, [])

  return { messageLog, appendLog }
}
