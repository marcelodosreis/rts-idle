import { useCallback, useState } from 'react'

export interface MessageLogEntry {
  readonly timestamp: number
  readonly type: 'info' | 'error' | 'command' | 'event'
  readonly message: string
}

const MAX_MESSAGE_LOG = 50

export function useMessageLog(): {
  readonly messageLog: readonly MessageLogEntry[]
  readonly appendLog: (type: MessageLogEntry['type'], message: string) => void
} {
  const [messageLog, setMessageLog] = useState<readonly MessageLogEntry[]>([])

  const appendLog = useCallback((type: MessageLogEntry['type'], message: string): void => {
    setMessageLog((prev) => {
      const entry: MessageLogEntry = { timestamp: Date.now(), type, message }
      const next = [entry, ...prev]
      return next.length > MAX_MESSAGE_LOG ? next.slice(0, MAX_MESSAGE_LOG) : next
    })
  }, [])

  return { messageLog, appendLog }
}
