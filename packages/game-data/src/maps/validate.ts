import { normalizeMapDefinition } from '@rts/shared'
import type { MapDefinition } from './types.js'

export type MapValidationResult =
  | { readonly ok: true; readonly map: MapDefinition; readonly errors: readonly [] }
  | { readonly ok: false; readonly errors: readonly string[] }

/** Game-data facade for the shared untrusted-map boundary validator. */
export function validateMapDefinition(value: unknown): MapValidationResult {
  const result = normalizeMapDefinition(value)
  if ('map' in result) {
    return { ok: true, map: result.map, errors: [] }
  }
  return { ok: false, errors: result.errors }
}
