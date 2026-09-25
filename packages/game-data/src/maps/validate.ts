import { normalizeMapDefinition } from '@rts/shared'
import type { MapDefinition } from './types.js'

export interface MapValidationResult {
  readonly ok: boolean
  readonly map?: MapDefinition
  readonly errors: readonly string[]
}

/** Game-data facade for the shared untrusted-map boundary validator. */
export function validateMapDefinition(value: unknown): MapValidationResult {
  const result = normalizeMapDefinition(value)
  return result.ok ? { ok: true, map: result.map, errors: [] } : { ok: false, errors: result.errors }
}
