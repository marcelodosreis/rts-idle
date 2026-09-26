import type { BuildingType } from '@rts/shared'
import type { MutableRefObject } from 'react'
import { useCallback, useRef, useState } from 'react'

/** Pending command modes that await a target click on the battlefield. */
export type CommandMode =
  | 'idle'
  | 'patrol'
  | 'attack'
  | 'attack_move'
  | { readonly kind: 'build'; readonly buildingType: BuildingType }
  | { readonly kind: 'rally'; readonly producerId: number }

export function isBuildMode(mode: CommandMode): mode is Extract<CommandMode, { readonly kind: 'build' }> {
  return typeof mode === 'object' && mode.kind === 'build'
}

export function buildingTypeForMode(mode: CommandMode): BuildingType | null {
  return isBuildMode(mode) ? mode.buildingType : null
}

export function isRallyMode(mode: CommandMode): mode is Extract<CommandMode, { readonly kind: 'rally' }> {
  return typeof mode === 'object' && mode.kind === 'rally'
}

export interface CommandModes {
  readonly mode: CommandMode
  /** Current mode as a stable ref (readable inside event handlers). */
  readonly modeRef: MutableRefObject<CommandMode>
  /** Toggles a pending mode; selecting it again (or any other) clears it. */
  arm(mode: Exclude<CommandMode, 'idle'>): void
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
  const [mode, setModeState] = useState<CommandMode>('idle')
  const modeRef = useRef<CommandMode>('idle')

  const setMode = useCallback((next: CommandMode): void => {
    modeRef.current = next
    setModeState(next)
  }, [])

  const arm = useCallback(
    (pending: Exclude<CommandMode, 'idle'>): void => {
      const current = modeRef.current
      const sameBuild = isBuildMode(current) && isBuildMode(pending) && current.buildingType === pending.buildingType
      setMode(current === pending || sameBuild ? 'idle' : pending)
    },
    [setMode]
  )

  const clear = useCallback((): void => {
    setMode('idle')
  }, [setMode])

  return { mode, modeRef, arm, clear }
}
