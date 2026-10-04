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

export const INT32_MIN = -2_147_483_648
export const INT32_MAX = 2_147_483_647

/** True when a JavaScript number is representable by the canonical signed i32 codec. */
export function isInt32(value: unknown): value is number {
  return isInteger(value) && value >= INT32_MIN && value <= INT32_MAX
}

/** Rejects values that canonical i32 encoding would otherwise truncate. */
export function assertInt32(value: number, context: string): void {
  if (!isInt32(value)) {
    throw new Error(`${context}: expected signed 32-bit integer, got ${value}`)
  }
}

export const UINT32_MIN = 0
export const UINT32_MAX = 4_294_967_295

/** True when a JavaScript number is representable by the canonical unsigned u32 codec. */
export function isUint32(value: unknown): value is number {
  return isInteger(value) && value >= UINT32_MIN && value <= UINT32_MAX
}

/** Rejects values that canonical u32 encoding would otherwise truncate. */
export function assertUint32(value: number, context: string): void {
  if (!isUint32(value)) {
    throw new Error(`${context}: expected unsigned 32-bit integer, got ${value}`)
  }
}

export function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0
}

export function isOptionalNonNegativeInteger(value: unknown): boolean {
  return value === undefined || isNonNegativeInteger(value)
}
