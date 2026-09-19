import {
  type DecorationPlacement,
  DRESSING_KINDS,
  type DressingKind,
  type MapDefinition,
  type MapTileKind,
  type StairEntry
} from './types.js'

const TILE_KINDS: ReadonlySet<string> = new Set<MapTileKind>(['water', 'land', 'elevated'])
const DRESSING_KIND_SET: ReadonlySet<string> = new Set<DressingKind>(DRESSING_KINDS)

export interface MapValidationResult {
  readonly ok: boolean
  /** Normalized definition; present only when `ok` is true. */
  readonly map?: MapDefinition
  readonly errors: readonly string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

/**
 * Validates untrusted JSON as a `MapDefinition`. Returns a normalized copy with
 * only the known fields, plus a list of human-readable errors. Shared by the
 * editor's JSON upload and the `?map=local` playtest bridge so both reject the
 * same malformed input.
 */
export function validateMapDefinition(value: unknown): MapValidationResult {
  const errors: string[] = []
  if (!isRecord(value)) {
    return { ok: false, errors: ['expected a JSON object'] }
  }

  const width = value.width
  const height = value.height
  if (!isInt(width) || width < 1) {
    errors.push('width must be a positive integer')
  }
  if (!isInt(height) || height < 1) {
    errors.push('height must be a positive integer')
  }

  const tiles = value.tiles
  if (!Array.isArray(tiles)) {
    errors.push('tiles must be an array')
  } else if (isInt(width) && isInt(height) && tiles.length !== width * height) {
    errors.push(`tiles must have ${width * height} entries (width × height)`)
  } else {
    for (let i = 0; i < tiles.length; i += 1) {
      if (!TILE_KINDS.has(tiles[i] as string)) {
        errors.push(`tiles[${i}] must be water, land, or elevated`)
        break
      }
    }
  }

  const stairs = validateStairs(value.stairs, errors)
  const decorations = validateDecorations(value.decorations, errors)
  const decorationCounts = validateDecorationCounts(value.decorationCounts, errors)

  const palette = value.palette
  if (palette !== undefined && typeof palette !== 'string') {
    errors.push('palette must be a string')
  }
  const decorationSeed = value.decorationSeed
  if (decorationSeed !== undefined && !isInt(decorationSeed)) {
    errors.push('decorationSeed must be an integer')
  }

  if (errors.length > 0 || !isInt(width) || !isInt(height) || !Array.isArray(tiles)) {
    return { ok: false, errors }
  }

  const map: MapDefinition = {
    width,
    height,
    tiles: tiles as MapTileKind[],
    ...(stairs !== undefined ? { stairs } : {}),
    ...(typeof palette === 'string' ? { palette } : {}),
    ...(isInt(decorationSeed) ? { decorationSeed } : {}),
    ...(decorations !== undefined ? { decorations } : {}),
    ...(decorationCounts !== undefined ? { decorationCounts } : {})
  }
  return { ok: true, map, errors: [] }
}

function validateStairs(value: unknown, errors: string[]): readonly StairEntry[] | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!Array.isArray(value)) {
    errors.push('stairs must be an array')
    return undefined
  }
  const stairs: StairEntry[] = []
  for (let i = 0; i < value.length; i += 1) {
    const entry = value[i]
    if (
      !isRecord(entry) ||
      !isInt(entry.x) ||
      !isInt(entry.y) ||
      (entry.direction !== 'left' && entry.direction !== 'right')
    ) {
      errors.push(`stairs[${i}] must be { x, y, direction: "left" | "right" }`)
      return undefined
    }
    stairs.push({ x: entry.x, y: entry.y, direction: entry.direction })
  }
  return stairs
}

function validateDecorations(value: unknown, errors: string[]): readonly DecorationPlacement[] | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!Array.isArray(value)) {
    errors.push('decorations must be an array')
    return undefined
  }
  const decorations: DecorationPlacement[] = []
  for (let i = 0; i < value.length; i += 1) {
    const entry = value[i]
    if (!isRecord(entry) || !isInt(entry.x) || !isInt(entry.y) || !DRESSING_KIND_SET.has(entry.kind as string)) {
      errors.push(`decorations[${i}] must be { x, y, kind }`)
      return undefined
    }
    if (entry.variant !== undefined && (!isInt(entry.variant) || entry.variant < 0)) {
      errors.push(`decorations[${i}].variant must be a non-negative integer`)
      return undefined
    }
    decorations.push({
      x: entry.x,
      y: entry.y,
      kind: entry.kind as DressingKind,
      ...(entry.variant !== undefined ? { variant: entry.variant } : {})
    })
  }
  return decorations
}

function validateDecorationCounts(
  value: unknown,
  errors: string[]
): Readonly<Partial<Record<DressingKind, number>>> | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!isRecord(value)) {
    errors.push('decorationCounts must be an object')
    return undefined
  }
  const counts: Partial<Record<DressingKind, number>> = {}
  for (const [kind, count] of Object.entries(value)) {
    if (!DRESSING_KIND_SET.has(kind)) {
      errors.push(`decorationCounts.${kind} is not a known decoration kind`)
      return undefined
    }
    if (!isInt(count) || count < 0) {
      errors.push(`decorationCounts.${kind} must be a non-negative integer`)
      return undefined
    }
    counts[kind as DressingKind] = count
  }
  return counts
}
