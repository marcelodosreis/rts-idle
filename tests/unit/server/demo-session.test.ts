import { PROTOCOL_VERSION } from '@rts/protocol'
import { describe, expect, it } from 'vitest'
import { createAuthoritativeMatch } from '../../../apps/server/src/bootstrap/match-bootstrap.js'

describe('demo session production components', () => {
  it('projects production state for every building with production capability', () => {
    const session = createAuthoritativeMatch({
      type: 'match_request',
      protocolVersion: PROTOCOL_VERSION,
      scenarioId: 'regression',
      aggression: 'passive',
      map: { source: 'catalog' }
    }).session

    const castle = session.observe(true).buildings.find((building) => building.buildingType === 'CASTLE')
    expect(castle?.production).toEqual({ queue: [] })
  })
})
