import type { PlayerId } from '@rts/shared'

/** Per-participant situation (master plan §7.3): wallet, supply, and outcome. */
export interface PlayerState {
  readonly mineral: number
  readonly energy: number
  readonly supplyUsed: number
  readonly supplyCap: number
  readonly hasCompletedBase: boolean
  readonly defeated: boolean
}

export const INITIAL_MINERAL = 400
export const INITIAL_ENERGY = 0
export const INITIAL_SUPPLY_USED = 0
export const INITIAL_SUPPLY_CAP = 0

/** Baseline per-participant state (master plan §11.1 resources baseline). */
export function createDefaultPlayerState(): PlayerState {
  return {
    mineral: INITIAL_MINERAL,
    energy: INITIAL_ENERGY,
    supplyUsed: INITIAL_SUPPLY_USED,
    supplyCap: INITIAL_SUPPLY_CAP,
    hasCompletedBase: false,
    defeated: false
  }
}

/** Four slots, one per PlayerId (neutrals are not player units). */
export function createDefaultPlayers(): PlayerState[] {
  return [
    createDefaultPlayerState(),
    createDefaultPlayerState(),
    createDefaultPlayerState(),
    createDefaultPlayerState()
  ]
}

/** Copies the four players array (independent, never shared outside the core). */
export function copyPlayers(players: readonly PlayerState[]): PlayerState[] {
  return players.map((player) => ({ ...player }))
}

/** Marks a slot defeated; the array is copied (immutability at the boundary). */
export function defeatPlayer(players: readonly PlayerState[], playerId: PlayerId): PlayerState[] {
  return players.map((player, index) => (index === playerId ? { ...player, defeated: true } : player))
}
