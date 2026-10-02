import { createRulesIdentity, createSimulation, type ScheduledCommand } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import {
  failureArtifact,
  parseReplay,
  REPLAY_FORMAT,
  REPLAY_FORMAT_VERSION,
  ReplayDivergenceError,
  type ReplayDocument,
  replayJson,
  runReplay
} from '../../tools/replay/src/replay.js'

const identity = createRulesIdentity('replay-tooling', {
  rulesetHash: 'replay-rules',
  mapId: 'replay-map',
  mapHash: 'replay-map-hash'
})

const commands: readonly ScheduledCommand[] = [
  {
    tick: 5,
    playerId: 0,
    sequence: 1,
    intent: { type: 'SURRENDER', payload: {} }
  }
]

function documentWithHashes(): ReplayDocument {
  const document: ReplayDocument = {
    format: REPLAY_FORMAT,
    version: REPLAY_FORMAT_VERSION,
    seed: 1234,
    identity,
    ticks: 8,
    commands
  }
  const result = runReplay(document)
  return { ...document, hashes: [{ tick: result.finalTick, hash: result.finalHash }] }
}

describe('headless replay tooling', () => {
  it('round-trips the deterministic command stream and final hash', () => {
    const document = documentWithHashes()
    const parsed = parseReplay(JSON.parse(replayJson(document)))
    expect(runReplay(parsed, true)).toEqual(runReplay(document))
  })

  it('reports the exact divergence tick during validation', () => {
    const document = documentWithHashes()
    const hashes = [{ tick: 5, hash: '0'.repeat(64) }]
    expect(() => runReplay({ ...document, hashes }, true)).toThrow(ReplayDivergenceError)
    try {
      runReplay({ ...document, hashes }, true)
    } catch (error) {
      expect(error).toMatchObject({ tick: 5, lastValidTick: 4, lastValidHash: expect.any(String) })
    }
  })

  it('writes a self-contained failure artifact', () => {
    const document = documentWithHashes()
    const artifact = JSON.parse(failureArtifact(document, new Error('boom'), 4, 'a'.repeat(64))) as {
      readonly failure: { readonly lastValidTick: number }
      readonly replay: { readonly commands: readonly unknown[] }
    }
    expect(artifact.failure.lastValidTick).toBe(4)
    expect(artifact.replay.commands).toHaveLength(1)
  })

  it('rejects tampered initial snapshot metadata and bytes', () => {
    const initialSimulation = createSimulation({ seed: 1234, identity })
    initialSimulation.step()
    const initial = initialSimulation.exportSnapshot()
    const document: ReplayDocument = { ...documentWithHashes(), initialSnapshot: initial, ticks: 2 }

    expect(() => runReplay({ ...document, initialSnapshot: { ...initial, hash: '0'.repeat(64) } })).toThrow(
      /envelope hash/
    )
    expect(() => runReplay({ ...document, initialSnapshot: { ...initial, tick: 2 } })).toThrow(/envelope tick/)
    expect(() =>
      runReplay({ ...document, initialSnapshot: { ...initial, bytes: Uint8Array.from([...initial.bytes, 0]) } })
    ).toThrow()
  })

  it('rejects identity and target tick mismatches before replay execution', () => {
    const initialSimulation = createSimulation({ seed: 1234, identity })
    initialSimulation.step()
    const initial = initialSimulation.exportSnapshot()
    const document: ReplayDocument = { ...documentWithHashes(), initialSnapshot: initial, ticks: 0 }
    expect(() => runReplay(document)).toThrow(/before initial snapshot tick/)
    expect(() =>
      runReplay({
        ...document,
        ticks: 2,
        identity: { ...identity, mapId: 'other-map' }
      })
    ).toThrow(/does not match the initial snapshot identity/)
  })
})
