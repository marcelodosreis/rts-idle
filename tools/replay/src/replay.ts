import {
  BUILDING_TYPES,
  COMMAND_TYPES,
  type CommandIntent,
  type EntityId,
  isInteger,
  isNonNegativeInteger,
  isOneOf,
  isRecord,
  type PlayerId,
  RESEARCH_TYPES,
  TRAINABLE_UNIT_KINDS
} from '@rts/shared'
import {
  createSimulation,
  type RulesIdentity,
  type ScheduledCommand,
  type SimulationHost,
  type SimulationSnapshot,
  simulationFromSnapshot,
  version as simulationVersion
} from '@rts/simulation'
import { REPLAY_FORMAT, REPLAY_FORMAT_VERSION } from './replay-format.js'

export { failureArtifact, replayJson } from './replay-serialization.js'
export { REPLAY_FORMAT, REPLAY_FORMAT_VERSION }

export interface ReplayHash {
  readonly tick: number
  readonly hash: string
}

export interface ReplayDocument {
  readonly format: typeof REPLAY_FORMAT
  readonly version: number
  readonly seed: number
  readonly identity: RulesIdentity
  readonly ticks: number
  readonly commands: readonly ScheduledCommand[]
  readonly hashes?: readonly ReplayHash[]
  readonly initialSnapshot?: SimulationSnapshot
}

export interface ReplayResult {
  readonly finalTick: number
  readonly finalHash: string
  readonly rejected: number
}

export class ReplayDivergenceError extends Error {
  readonly tick: number
  readonly expected: string
  readonly actual: string
  readonly lastValidTick: number
  readonly lastValidHash: string

  constructor(tick: number, expected: string, actual: string, lastValidTick: number, lastValidHash: string) {
    super(`replay divergence at tick ${tick}: expected ${expected}, got ${actual}`)
    this.name = 'ReplayDivergenceError'
    this.tick = tick
    this.expected = expected
    this.actual = actual
    this.lastValidTick = lastValidTick
    this.lastValidHash = lastValidHash
  }
}

interface JsonObject {
  readonly [key: string]: unknown
  readonly buildingType?: unknown
  readonly commands?: unknown
  readonly format?: unknown
  readonly hashes?: unknown
  readonly identity?: unknown
  readonly initialSnapshot?: unknown
  readonly intent?: unknown
  readonly payload?: unknown
  readonly researchType?: unknown
  readonly type?: unknown
  readonly unitIds?: unknown
  readonly unitKind?: unknown
}

function record(value: unknown, name: string): JsonObject {
  if (!isRecord(value)) {
    throw new Error(`${name} must be an object`)
  }
  return value
}

function requiredString(source: JsonObject, key: string): string {
  const value = source[key]
  if (typeof value !== 'string') {
    throw new Error(`${key} must be a string`)
  }
  return value
}

function requiredInteger(source: JsonObject, key: string, nonNegative = false): number {
  const value = source[key]
  if (!isInteger(value) || (nonNegative && value < 0)) {
    throw new Error(`${key} must be an integer${nonNegative ? ' >= 0' : ''}`)
  }
  return value
}

function parseIds(value: unknown): readonly EntityId[] {
  if (!Array.isArray(value) || !value.every(isNonNegativeInteger)) {
    throw new Error('unitIds must be an array of non-negative integers')
  }
  return value
}

function parseCoordinates(payload: JsonObject): { readonly x: number; readonly y: number } {
  return {
    x: requiredInteger(payload, 'x'),
    y: requiredInteger(payload, 'y')
  }
}

function parseCoordinateIntent(type: 'MOVE' | 'PATROL' | 'ATTACK_MOVE', payload: JsonObject): CommandIntent {
  const value = { unitIds: parseIds(payload.unitIds), ...parseCoordinates(payload) }
  switch (type) {
    case 'MOVE':
      return { type, payload: value }
    case 'PATROL':
      return { type, payload: value }
    case 'ATTACK_MOVE':
      return { type, payload: value }
  }
}

function parseUnitIdsIntent(type: 'STOP' | 'HOLD', payload: JsonObject): CommandIntent {
  const value = { unitIds: parseIds(payload.unitIds) }
  return type === 'STOP' ? { type, payload: value } : { type, payload: value }
}

function parseTargetIntent(type: 'REPAIR' | 'HEAL', payload: JsonObject): CommandIntent {
  const value = { unitIds: parseIds(payload.unitIds), targetId: requiredInteger(payload, 'targetId', true) }
  return type === 'REPAIR' ? { type, payload: value } : { type, payload: value }
}

function parseInteractionIntent(type: 'ATTACK' | 'GATHER' | 'DEPOSIT', payload: JsonObject): CommandIntent {
  const unitIds = parseIds(payload.unitIds)
  if (type === 'ATTACK') {
    return { type, payload: { unitIds, targetId: requiredInteger(payload, 'targetId', true) } }
  }
  if (type === 'GATHER') {
    return { type, payload: { unitIds, resourceId: requiredInteger(payload, 'resourceId', true) } }
  }
  return { type, payload: { unitIds, buildingId: requiredInteger(payload, 'buildingId', true) } }
}

function parseBuildIntent(payload: JsonObject): CommandIntent {
  const buildingType = payload.buildingType
  if (!isOneOf(BUILDING_TYPES, buildingType)) {
    throw new Error('BUILD.payload.buildingType is not supported')
  }
  return {
    type: 'BUILD',
    payload: { unitId: requiredInteger(payload, 'unitId', true), buildingType, ...parseCoordinates(payload) }
  }
}

function parseTrainIntent(payload: JsonObject): CommandIntent {
  const unitKind = payload.unitKind
  if (!isOneOf(TRAINABLE_UNIT_KINDS, unitKind)) {
    throw new Error('TRAIN.payload.unitKind is not supported')
  }
  return { type: 'TRAIN', payload: { producerId: requiredInteger(payload, 'producerId', true), unitKind } }
}

function parseResearchIntent(payload: JsonObject): CommandIntent {
  const researchType = payload.researchType
  if (!isOneOf(RESEARCH_TYPES, researchType)) {
    throw new Error('RESEARCH.payload.researchType is not supported')
  }
  return { type: 'RESEARCH', payload: { monasteryId: requiredInteger(payload, 'monasteryId', true), researchType } }
}

function parseIntent(value: unknown): CommandIntent {
  const source = record(value, 'intent')
  const type = source.type
  if (!isOneOf(COMMAND_TYPES, type)) {
    throw new Error('intent.type is not a supported command')
  }
  const payload = record(source.payload, `${type}.payload`)
  switch (type) {
    case 'MOVE':
    case 'PATROL':
    case 'ATTACK_MOVE':
      return parseCoordinateIntent(type, payload)
    case 'STOP':
    case 'HOLD':
      return parseUnitIdsIntent(type, payload)
    case 'ATTACK':
    case 'GATHER':
    case 'DEPOSIT':
      return parseInteractionIntent(type, payload)
    case 'REPAIR':
    case 'HEAL':
      return parseTargetIntent(type, payload)
    case 'BUILD':
      return parseBuildIntent(payload)
    case 'UPGRADE_CASTLE':
      return { type, payload: { castleId: requiredInteger(payload, 'castleId', true) } }
    case 'CANCEL_CONSTRUCTION':
      return { type, payload: { buildingId: requiredInteger(payload, 'buildingId', true) } }
    case 'TRAIN':
      return parseTrainIntent(payload)
    case 'CANCEL_PRODUCTION':
      return {
        type,
        payload: {
          producerId: requiredInteger(payload, 'producerId', true),
          queueIndex: requiredInteger(payload, 'queueIndex', true)
        }
      }
    case 'RESEARCH':
      return parseResearchIntent(payload)
    case 'CANCEL_RESEARCH':
      return {
        type,
        payload: {
          monasteryId: requiredInteger(payload, 'monasteryId', true),
          queueIndex: requiredInteger(payload, 'queueIndex', true)
        }
      }
    case 'RALLY':
      return {
        type,
        payload: { producerId: requiredInteger(payload, 'producerId', true), ...parseCoordinates(payload) }
      }
    case 'SURRENDER':
      return { type, payload: {} }
    default:
      throw new Error(`unsupported command ${type}`)
  }
}

function parseCommand(value: unknown): ScheduledCommand {
  const source = record(value, 'command')
  const playerId = requiredInteger(source, 'playerId', true)
  if (playerId > 3) {
    throw new Error('playerId must be between 0 and 3')
  }
  return {
    tick: requiredInteger(source, 'tick', true),
    playerId: playerId as PlayerId,
    sequence: requiredInteger(source, 'sequence', true),
    intent: parseIntent(source.intent)
  }
}

function parseIdentity(value: unknown): RulesIdentity {
  const source = record(value, 'identity')
  return {
    simulationVersion: requiredString(source, 'simulationVersion'),
    rulesetVersion: requiredString(source, 'rulesetVersion'),
    rulesetHash: requiredString(source, 'rulesetHash'),
    mapId: requiredString(source, 'mapId'),
    mapHash: requiredString(source, 'mapHash')
  }
}

function parseHashes(value: unknown): readonly ReplayHash[] | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!Array.isArray(value)) {
    throw new Error('hashes must be an array')
  }
  return value.map((entry) => {
    const source = record(entry, 'hash')
    const hash = requiredString(source, 'hash')
    if (!/^[0-9a-f]{64}$/.test(hash)) {
      throw new Error('hash must be a lowercase SHA-256 value')
    }
    return { tick: requiredInteger(source, 'tick', true), hash }
  })
}

function parseInitialSnapshot(value: unknown): SimulationSnapshot | undefined {
  if (value === undefined) {
    return undefined
  }
  const source = record(value, 'initialSnapshot')
  const encoded = requiredString(source, 'bytesBase64')
  const bytes = Uint8Array.from(Buffer.from(encoded, 'base64'))
  return {
    tick: requiredInteger(source, 'tick', true),
    hash: requiredString(source, 'hash'),
    bytes
  }
}

function identitiesEqual(first: RulesIdentity, second: RulesIdentity): boolean {
  return (
    first.simulationVersion === second.simulationVersion &&
    first.rulesetVersion === second.rulesetVersion &&
    first.rulesetHash === second.rulesetHash &&
    first.mapId === second.mapId &&
    first.mapHash === second.mapHash
  )
}

function validateInitialSnapshot(document: ReplayDocument): void {
  const snapshot = document.initialSnapshot
  if (snapshot === undefined) {
    return
  }
  if (document.ticks < snapshot.tick) {
    throw new Error(`replay target tick ${document.ticks} is before initial snapshot tick ${snapshot.tick}`)
  }
  const simulation = simulationFromSnapshot(snapshot)
  if (!identitiesEqual(simulation.rulesIdentity(), document.identity)) {
    throw new Error('replay identity does not match the initial snapshot identity')
  }
  if (simulation.inspectState().seed !== document.seed) {
    throw new Error('replay seed does not match the initial snapshot seed')
  }
}

function validateReplayDocument(document: ReplayDocument): void {
  if (document.identity.simulationVersion !== simulationVersion) {
    throw new Error(`unsupported simulation version ${document.identity.simulationVersion}`)
  }
  validateInitialSnapshot(document)
}

export function parseReplay(value: unknown): ReplayDocument {
  const source = record(value, 'replay')
  if (source.format !== REPLAY_FORMAT) {
    throw new Error(`format must be ${REPLAY_FORMAT}`)
  }
  const version = requiredInteger(source, 'version', true)
  if (version !== REPLAY_FORMAT_VERSION) {
    throw new Error(`unsupported replay format version ${version}`)
  }
  const commandsValue = source.commands
  if (!Array.isArray(commandsValue)) {
    throw new Error('commands must be an array')
  }
  const hashes = parseHashes(source.hashes)
  const initialSnapshot = parseInitialSnapshot(source.initialSnapshot)
  const identity = parseIdentity(source.identity)
  if (identity.simulationVersion !== simulationVersion) {
    throw new Error(`unsupported simulation version ${identity.simulationVersion}`)
  }
  const document: ReplayDocument = {
    format: REPLAY_FORMAT,
    version,
    seed: requiredInteger(source, 'seed', true),
    identity,
    ticks: requiredInteger(source, 'ticks', true),
    commands: commandsValue.map(parseCommand),
    ...(hashes === undefined ? {} : { hashes }),
    ...(initialSnapshot === undefined ? {} : { initialSnapshot })
  }
  validateReplayDocument(document)
  return document
}

function expectedHashAt(document: ReplayDocument, tick: number): string | undefined {
  return document.hashes?.find((entry) => entry.tick === tick)?.hash
}

function createReplaySimulation(document: ReplayDocument): SimulationHost {
  if (document.initialSnapshot !== undefined) {
    return simulationFromSnapshot(document.initialSnapshot)
  }
  return createSimulation({ seed: document.seed, identity: document.identity })
}

export function runReplay(document: ReplayDocument, validate = false): ReplayResult {
  validateReplayDocument(document)
  const simulation = createReplaySimulation(document)
  let rejected = 0
  let lastValidTick = simulation.tick()
  let lastValidHash = simulation.hashState()
  let commands = document.commands
  while (simulation.tick() < document.ticks) {
    const result = simulation.step(commands)
    rejected += result.rejected.length
    commands = []
    if (validate) {
      const expected = expectedHashAt(document, result.tick)
      if (expected !== undefined && expected !== simulation.hashState()) {
        throw new ReplayDivergenceError(result.tick, expected, simulation.hashState(), lastValidTick, lastValidHash)
      }
    }
    lastValidTick = result.tick
    lastValidHash = simulation.hashState()
  }
  return { finalTick: simulation.tick(), finalHash: simulation.hashState(), rejected }
}
