import { sha256 } from '@noble/hashes/sha256'
import { utf8Encode } from '../canonical/utf8.js'
import type { SimulationObservation } from '../engine/observation.js'
import type { GameState } from '../state/state.js'
import { serializeState } from './serialize.js'

/** SHA-256 digest of canonical bytes, hex-encoded (ADR-002/011). */
export function hashBytes(bytes: Uint8Array): string {
  const digest = sha256(bytes)
  return bytesToHex(digest)
}

function bytesToHex(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 1) {
    out += (bytes[i] ?? 0).toString(16).padStart(2, '0')
  }
  return out
}

/** Canonical hash of a full game state (serialize then hash). */
export function hashState(state: GameState): string {
  return hashBytes(serializeState(state))
}

/** Hashes a player observation without exposing the canonical hidden state. */
export function hashObservation(observation: SimulationObservation): string {
  return hashBytes(Uint8Array.from(utf8Encode(JSON.stringify({ ...observation, resourcesComplete: true }))))
}
