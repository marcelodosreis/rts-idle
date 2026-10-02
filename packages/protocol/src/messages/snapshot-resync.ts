import { field, isRecord } from '@rts/shared'
import { isSnapshotViewHash, isSnapshotViewSequence } from './snapshot-metadata.js'

export interface SnapshotResyncRequest {
  readonly type: 'snapshot_resync_request'
  readonly baseSequence: number
  readonly baseHash: string
}

export function isSnapshotResyncRequest(value: unknown): value is SnapshotResyncRequest {
  return (
    isRecord(value) &&
    field(value, 'type') === 'snapshot_resync_request' &&
    isSnapshotViewSequence(field(value, 'baseSequence')) &&
    isSnapshotViewHash(field(value, 'baseHash'))
  )
}
