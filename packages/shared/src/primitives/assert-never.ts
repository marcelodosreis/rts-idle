/**
 * Exhaustiveness guard for discriminated unions (strong-typing policy).
 *
 * Call in the `default` branch of a `switch` over a closed union. If every
 * member is handled, `value` narrows to `never` and this compiles; when a new
 * member is added, the call site fails to typecheck instead of silently
 * no-op'ing at runtime.
 */
export function assertNever(value: never, context?: string): never {
  throw new Error(context === undefined ? `Unexpected value: ${String(value)}` : `${context}: ${String(value)}`)
}
