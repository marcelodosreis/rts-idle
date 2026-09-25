import type { SnapshotPlayer } from '@rts/protocol'
import type { PlayerState } from '@rts/simulation'

export function projectPlayers(players: readonly PlayerState[]): readonly SnapshotPlayer[] {
  return players.map((player) => ({
    id: player.id,
    defeated: player.defeated,
    gold: player.gold,
    usedSupply: player.usedSupply,
    supplyCap: player.supplyCap
  }))
}
