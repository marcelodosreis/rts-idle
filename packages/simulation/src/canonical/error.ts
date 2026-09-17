/** Thrown when canonical bytes are structurally invalid (bad UTF-8, truncated input). */
export class CanonicalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CanonicalError'
  }
}
