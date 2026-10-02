import type { ReplayDocument } from './replay.js'
import { REPLAY_FORMAT, REPLAY_FORMAT_VERSION } from './replay-format.js'

export function replayJson(document: ReplayDocument): string {
  const serializable = {
    ...document,
    initialSnapshot:
      document.initialSnapshot === undefined
        ? undefined
        : {
            tick: document.initialSnapshot.tick,
            hash: document.initialSnapshot.hash,
            bytesBase64: Buffer.from(document.initialSnapshot.bytes).toString('base64')
          }
  }
  return `${JSON.stringify(serializable, null, 2)}\n`
}

export function failureArtifact(
  document: ReplayDocument,
  error: unknown,
  lastValidTick: number,
  lastValidHash: string
): string {
  const message = error instanceof Error ? error.message : String(error)
  return `${JSON.stringify(
    {
      format: REPLAY_FORMAT,
      version: REPLAY_FORMAT_VERSION,
      failure: { message, lastValidTick, lastValidHash },
      replay: JSON.parse(replayJson(document))
    },
    null,
    2
  )}\n`
}
