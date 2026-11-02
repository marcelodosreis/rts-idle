import { PROTOCOL_VERSION } from '@rts/protocol'
import { describe, expect, it } from 'vitest'
import { createAuthoritativeMatch } from '../../apps/server/src/bootstrap/match-bootstrap.js'

function regressionSession() {
  return createAuthoritativeMatch({
    type: 'match_request',
    protocolVersion: PROTOCOL_VERSION,
    scenarioId: 'regression',
    aggression: 'passive',
    map: { source: 'catalog' }
  }).session
}

describe('regression army chokepoint composition (P3.12.01)', () => {
  it('pins the army, buildings, wallet, and initial fog state', () => {
    const session = regressionSession()
    const complete = session.observe(true)
    const playerUnits = complete.units.filter((unit) => unit.owner === 0)
    const enemyUnits = complete.units.filter((unit) => unit.owner === 1)

    expect(playerUnits.filter((unit) => unit.kind === 'pawn')).toHaveLength(4)
    expect(playerUnits.map((unit) => unit.kind).sort()).toEqual(
      ['archer', 'lancer', 'monk', 'pawn', 'pawn', 'pawn', 'pawn', 'warrior'].sort()
    )
    expect(enemyUnits).toHaveLength(8)
    expect(
      complete.buildings.filter((building) => building.owner === 0).map((building) => building.buildingType)
    ).toEqual(['CASTLE', 'HOUSE'])
    expect(
      complete.buildings.filter((building) => building.owner === 1).map((building) => building.buildingType)
    ).toEqual(['CASTLE'])
    const player = complete.players.find((candidate) => candidate.id === 0)
    expect(player?.resources.GOLD).toBe(600)

    const playerView = session.observeForPlayer(0, false)
    expect(playerView.units.some((unit) => unit.owner === 1)).toBe(true)
    expect(playerView.fog.visibleTiles).toContain(18 + 17 * 32)
    expect(playerView.fog.visibleTiles).not.toContain(23 + 24 * 32)
  })
})
