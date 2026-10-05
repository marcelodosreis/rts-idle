import {
  INCREMENTAL_INVALIDATION_REASONS,
  INCREMENTAL_SEARCH_RESULTS,
  type IncrementalSearchState,
  type OpenEntry
} from '@rts/pathfinding'
import type { CanonicalReader } from '../canonical/reader.js'
import type { CanonicalWriter } from '../canonical/writer.js'
import {
  createNavigationStateFromDefinition,
  type NavigationGridDefinition,
  type NavigationRequestState,
  type NavigationState
} from './navigation-state.js'

const NULL_INDEX = -1

function writeNullableIndex(writer: CanonicalWriter, index: number | null): void {
  writer.writeI32(index ?? NULL_INDEX)
}

function readNullableIndex(reader: CanonicalReader): number | null {
  const index = reader.readI32()
  if (index === NULL_INDEX) {
    return null
  }
  if (index < 0) {
    throw new Error('navigation codec: invalid nullable tile index')
  }
  return index
}

function writeIdentity(writer: CanonicalWriter, state: IncrementalSearchState): void {
  writer.writeU32(state.requestId)
  writeNullableIndex(writer, state.startTileIndex)
  writeNullableIndex(writer, state.destinationTileIndex)
  if (state.destination === null) {
    writer.writeU8(0)
  } else {
    writer.writeU8(1)
    writer.writeI32(state.destination.x)
    writer.writeI32(state.destination.y)
  }
}

function readIdentity(reader: CanonicalReader): {
  readonly requestId: number
  readonly startTileIndex: number | null
  readonly destinationTileIndex: number | null
  readonly destination: { readonly x: number; readonly y: number } | null
} {
  const requestId = reader.readU32()
  const startTileIndex = readNullableIndex(reader)
  const destinationTileIndex = readNullableIndex(reader)
  const hasDestination = reader.readU8()
  if (hasDestination === 0) {
    return { requestId, startTileIndex, destinationTileIndex, destination: null }
  }
  if (hasDestination !== 1) {
    throw new Error('navigation codec: invalid destination flag')
  }
  return {
    requestId,
    startTileIndex,
    destinationTileIndex,
    destination: { x: reader.readI32(), y: reader.readI32() }
  }
}

function writeOpenEntries(writer: CanonicalWriter, entries: readonly OpenEntry[]): void {
  writer.writeLength(entries.length)
  for (const entry of entries) {
    writer.writeU32(entry.tileIndex)
    writer.writeU32(entry.g)
    writer.writeU32(entry.h)
    writer.writeU32(entry.f)
  }
}

function readOpenEntries(reader: CanonicalReader): readonly OpenEntry[] {
  const entries: OpenEntry[] = []
  const count = reader.readLength()
  for (let index = 0; index < count; index += 1) {
    entries.push({
      tileIndex: reader.readU32(),
      g: reader.readU32(),
      h: reader.readU32(),
      f: reader.readU32()
    })
  }
  return Object.freeze(entries)
}

function writeSearchState(writer: CanonicalWriter, state: IncrementalSearchState): void {
  writer.writeU8(INCREMENTAL_SEARCH_RESULTS.indexOf(state.status))
  writeIdentity(writer, state)
  writer.writeU32(state.expanded)
  switch (state.status) {
    case 'PENDING':
      writeOpenEntries(writer, state.open)
      writer.writeLength(state.scores.length)
      for (const score of state.scores) {
        writer.writeU32(score.tileIndex)
        writer.writeU32(score.g)
      }
      writer.writeLength(state.parents.length)
      for (const parent of state.parents) {
        writer.writeU32(parent.tileIndex)
        writer.writeU32(parent.parentTileIndex)
      }
      writer.writeLength(state.closed.length)
      for (const tileIndex of state.closed) {
        writer.writeU32(tileIndex)
      }
      return
    case 'FOUND':
      writer.writeU32(state.cost)
      writer.writeLength(state.path.length)
      for (const tileIndex of state.path) {
        writer.writeU32(tileIndex)
      }
      return
    case 'UNREACHABLE':
      return
    case 'INVALIDATED':
      writer.writeU8(INCREMENTAL_INVALIDATION_REASONS.indexOf(state.reason))
      return
  }
}

function readStatus(reader: CanonicalReader): IncrementalSearchState['status'] {
  const status = INCREMENTAL_SEARCH_RESULTS[reader.readU8()]
  if (status === undefined) {
    throw new Error('navigation codec: invalid search status')
  }
  return status
}

function readReason(
  reader: CanonicalReader
): 'NAVIGATION_CHANGED' | 'START_OUT_OF_BOUNDS' | 'START_BLOCKED' | 'NO_DESTINATION' {
  const reason = INCREMENTAL_INVALIDATION_REASONS[reader.readU8()]
  if (reason === undefined) {
    throw new Error('navigation codec: invalid invalidation reason')
  }
  return reason
}

function readSearchState(reader: CanonicalReader): IncrementalSearchState {
  const status = readStatus(reader)
  const identity = readIdentity(reader)
  const expanded = reader.readU32()
  switch (status) {
    case 'PENDING': {
      const open = readOpenEntries(reader)
      const scores = []
      const scoreCount = reader.readLength()
      for (let index = 0; index < scoreCount; index += 1) {
        scores.push({ tileIndex: reader.readU32(), g: reader.readU32() })
      }
      const parents = []
      const parentCount = reader.readLength()
      for (let index = 0; index < parentCount; index += 1) {
        parents.push({ tileIndex: reader.readU32(), parentTileIndex: reader.readU32() })
      }
      const closed = []
      const closedCount = reader.readLength()
      for (let index = 0; index < closedCount; index += 1) {
        closed.push(reader.readU32())
      }
      return Object.freeze({
        ...identity,
        status,
        expanded,
        open,
        scores: Object.freeze(scores),
        parents: Object.freeze(parents),
        closed: Object.freeze(closed)
      })
    }
    case 'FOUND': {
      const path = []
      const cost = reader.readU32()
      const pathLength = reader.readLength()
      for (let index = 0; index < pathLength; index += 1) {
        path.push(reader.readU32())
      }
      return Object.freeze({ ...identity, status, expanded, path: Object.freeze(path), cost })
    }
    case 'UNREACHABLE':
      return Object.freeze({ ...identity, status, expanded })
    case 'INVALIDATED':
      return Object.freeze({ ...identity, status, expanded, reason: readReason(reader) })
  }
}

function writeDefinition(writer: CanonicalWriter, definition: NavigationGridDefinition): void {
  writer.writeU32(definition.width)
  writer.writeU32(definition.height)
  writer.writeLength(definition.blockedTiles.length)
  for (const tile of definition.blockedTiles) {
    writer.writeU32(tile.x)
    writer.writeU32(tile.y)
  }
}

function readDefinition(reader: CanonicalReader): NavigationGridDefinition {
  const width = reader.readU32()
  const height = reader.readU32()
  const blockedTiles = []
  const blockedTileCount = reader.readLength()
  for (let index = 0; index < blockedTileCount; index += 1) {
    blockedTiles.push({ x: reader.readU32(), y: reader.readU32() })
  }
  return {
    width,
    height,
    blockedTiles
  }
}

function compareRequests(left: NavigationRequestState, right: NavigationRequestState): number {
  return left.state.requestId - right.state.requestId
}

export function writeNavigationState(writer: CanonicalWriter, state: NavigationState): void {
  writeDefinition(writer, state.staticDefinition)
  writeDefinition(writer, state.definition)
  writer.writeU32(state.nextRequestId)
  writer.writeU32(state.roundRobinCursor)
  const requests = [...state.requests].sort(compareRequests)
  writer.writeLength(requests.length)
  for (const request of requests) {
    writer.writeU32(request.submittedTick)
    writer.writeI32(request.availableTick ?? NULL_INDEX)
    writeSearchState(writer, request.state)
  }
}

export function readNavigationState(reader: CanonicalReader): NavigationState {
  const staticDefinition = readDefinition(reader)
  const definition = readDefinition(reader)
  const nextRequestId = reader.readU32()
  const roundRobinCursor = reader.readU32()
  const requests: NavigationRequestState[] = []
  const requestCount = reader.readLength()
  for (let index = 0; index < requestCount; index += 1) {
    const submittedTick = reader.readU32()
    const availableTickValue = reader.readI32()
    if (availableTickValue < NULL_INDEX) {
      throw new Error('navigation codec: invalid availability tick')
    }
    const state = readSearchState(reader)
    requests.push({
      submittedTick,
      availableTick: availableTickValue === NULL_INDEX ? null : availableTickValue,
      state
    })
  }
  return createNavigationStateFromDefinition(staticDefinition, definition, requests, nextRequestId, roundRobinCursor)
}
