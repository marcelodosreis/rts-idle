/**
 * Shared boundary-parsing primitives (strong-typing policy).
 *
 * Untrusted input (`unknown`) is narrowed with these helpers instead of property
 * access or casts, so callers never index an unknown object directly and the
 * domain stays strongly typed.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isOneOf<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && (values as readonly string[]).includes(value)
}

/** Explicit, centralised index access on a validated record. */
export function field(source: Record<string, unknown>, key: string): unknown {
  return source[key]
}

export function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

export function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0
}

export function isOptionalNonNegativeInteger(value: unknown): boolean {
  return value === undefined || isNonNegativeInteger(value)
}
