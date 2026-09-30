import type { SnapshotBuilding } from '@rts/protocol'
import { describe, expect, it } from 'vitest'
import {
  blockedCommandNotification,
  matchErrorNotification,
  notificationPresentation
} from '../../../apps/web/src/features/match/ui/hud-notifications'

function house(): SnapshotBuilding {
  return {
    id: 9,
    buildingType: 'HOUSE',
    x: 0,
    y: 0,
    owner: 0,
    footprint: { width: 2, height: 2 },
    status: 'COMPLETED',
    progressTicks: 100,
    totalTicks: 100,
    builderId: null
  }
}

describe('HUD notification policy', () => {
  it('presents completed construction as a deduplicated success toast', () => {
    expect(notificationPresentation({ kind: 'CONSTRUCTION_COMPLETED', building: house() })).toEqual({
      context: null,
      toast: {
        type: 'success',
        title: 'Construction complete',
        description: 'House',
        dedupeKey: 'construction-complete:9'
      }
    })
  })

  it('routes typed command blocks to their contextual target', () => {
    const notification = blockedCommandNotification('not enough minerals', 'minerals')
    expect(notificationPresentation(notification)).toEqual({
      context: { message: 'Insufficient minerals', target: 'minerals' },
      toast: null
    })
  })

  it('classifies match request errors as global toast and context feedback', () => {
    const notification = matchErrorNotification('MATCH_REQUEST: invalid scenario')
    expect(notificationPresentation(notification)).toEqual({
      context: { message: 'invalid scenario', target: 'command' },
      toast: {
        type: 'error',
        title: 'Match error',
        description: 'MATCH_REQUEST: invalid scenario',
        dedupeKey: 'match-error:MATCH_REQUEST: invalid scenario'
      }
    })
  })

  it('preserves connection error details in the global notification', () => {
    const notification = matchErrorNotification('Connection timed out')
    expect(notificationPresentation(notification)).toMatchObject({
      context: { message: 'Connection timed out', target: 'command' },
      toast: { description: 'Connection timed out' }
    })
  })
})
