import type { RawData } from 'ws'

export type DecodedMessage = { readonly value: unknown } | { readonly error: 'invalid JSON' }

export function decodeMessage(raw: RawData): DecodedMessage {
  try {
    return { value: JSON.parse(raw.toString()) }
  } catch {
    return { error: 'invalid JSON' }
  }
}
