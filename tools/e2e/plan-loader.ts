import { readFileSync } from 'node:fs'
import type { E2eGroup, E2ePlan } from './plan-types.js'

export function readPlan(path: string): E2ePlan {
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'))
  if (!isPlan(value)) {
    throw new Error(`invalid E2E plan: ${path}`)
  }
  return value
}

export function selectGroup(plan: E2ePlan, groupId: string): E2eGroup {
  const group = plan.groups.find((candidate) => candidate.id === groupId)
  if (group === undefined) {
    throw new Error(`E2E group not found: ${groupId}`)
  }
  return group
}

function isPlan(value: unknown): value is E2ePlan {
  const version = isRecord(value) ? readField(value, 'version') : undefined
  const generatedAt = isRecord(value) ? readField(value, 'generatedAt') : undefined
  const groups = isRecord(value) ? readField(value, 'groups') : undefined
  if (version !== 1 || typeof generatedAt !== 'string' || !Array.isArray(groups)) {
    return false
  }
  return groups.every(isGroup)
}

function isGroup(value: unknown): value is E2eGroup {
  const id = isRecord(value) ? readField(value, 'id') : undefined
  const category = isRecord(value) ? readField(value, 'category') : undefined
  const browser = isRecord(value) ? readField(value, 'browser') : undefined
  const estimatedDurationMs = isRecord(value) ? readField(value, 'estimatedDurationMs') : undefined
  const tests = isRecord(value) ? readField(value, 'tests') : undefined
  if (
    typeof id !== 'string' ||
    (category !== 'functional' && category !== 'performance') ||
    (browser !== 'chromium' && browser !== 'firefox') ||
    typeof estimatedDurationMs !== 'number' ||
    !Array.isArray(tests)
  ) {
    return false
  }
  return tests.every(isPlanTest)
}

function isPlanTest(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }
  return typeof readField(value, 'file') === 'string' && typeof readField(value, 'line') === 'number'
}

function readField(object: UnknownObject, key: string): unknown {
  return object[key]
}

interface UnknownObject {
  readonly [key: string]: unknown
}

function isRecord(value: unknown): value is UnknownObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
