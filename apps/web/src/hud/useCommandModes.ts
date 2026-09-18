import type { MutableRefObject } from 'react'
import { useCallback, useRef, useState } from 'react'

/** Pending command modes that await a target click on the battlefield. */
export type CommandMode = 'none' | 'patrol' | 'attack_move' | 'attack'

export interface CommandModes {
  readonly mode: CommandMode
  /** Current mode as a stable ref (readable inside event handlers). */
  readonly modeRef: MutableRefObject<CommandMode>
  /** Toggles a pending mode; selecting it again (or any other) clears it. */
  arm(mode: Exclude<CommandMode, 'none'>): void
  /** Clears any pending mode (also called after a targeted order is issued). */
  clear(): void
}

/**
 * Manages the pending-order mode for the command bar. The mode is exposed both
 * as React state (for the button highlight) and as a ref (so the match session
 * event handlers can read it without re-subscribing). `arm`/`clear` are
 * referentially stable so effects can depend on them safely.
 */
export function useCommandModes(): CommandModes {
  const [mode, setModeState] = useState<CommandMode>('none')
  const modeRef = useRef<CommandMode>('none')

  const setMode = useCallback((next: CommandMode): void => {
    modeRef.current = next
    setModeState(next)
  }, [])

  const arm = useCallback(
    (pending: Exclude<CommandMode, 'none'>): void => {
      setMode(modeRef.current === pending ? 'none' : pending)
    },
    [setMode]
  )

  const clear = useCallback((): void => {
    setMode('none')
  }, [setMode])

  return { mode, modeRef, arm, clear }
}
