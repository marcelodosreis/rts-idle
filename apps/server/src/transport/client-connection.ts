import { isCommandMessage, isMatchRequest, isSnapshotResyncRequest, type MatchConfig } from '@rts/protocol'
import type { CommandIntent } from '@rts/shared'
import type { RawData } from 'ws'
import { bootstrapMatch } from '../bootstrap/match-bootstrap.js'
import type { GameSession } from '../sessions/session.js'
import { decodeMessage } from './message-decoder.js'
import { SnapshotSender, type SnapshotSocket } from './snapshot-sender.js'

export const TICK_MS = 50
export const RECONNECT_GRACE_MS = 60_000

interface ClientSocket extends SnapshotSocket {
  on(event: 'message', listener: (raw: RawData) => void): this
  on(event: 'close', listener: () => void): this
  close(): void
}

type ConnectionLifecycle = 'awaiting_request' | 'running' | 'closed'

interface MatchRuntime {
  readonly session: GameSession
  readonly config: MatchConfig
  timer: ReturnType<typeof setInterval> | null
  expirationTimer: ReturnType<typeof setTimeout> | null
  nextSequence: number
  client: ClientConnection | null
}

const MATCHES = new Map<string, MatchRuntime>()

/** One isolated match per socket, mirroring the future rooms architecture. */
export class ClientConnection {
  private runtime: MatchRuntime | null = null
  private lifecycle: ConnectionLifecycle = 'awaiting_request'
  private readonly sender: SnapshotSender

  constructor(private readonly ws: ClientSocket) {
    this.sender = new SnapshotSender(ws)
  }

  start(): void {
    this.ws.on('message', (raw) => this.onMessage(raw))
    this.ws.on('close', () => this.close())
  }

  private schedule(intent: CommandIntent): void {
    if (this.runtime === null || this.runtime.client !== this) {
      return
    }
    this.runtime.session.submit(0, [
      {
        tick: this.runtime.session.tick() + 1,
        playerId: 0,
        sequence: this.runtime.nextSequence++,
        intent
      }
    ])
  }

  private startTicker(runtime: MatchRuntime): void {
    if (runtime.timer !== null) {
      return
    }
    runtime.timer = setInterval(() => this.tickRuntime(runtime), TICK_MS)
  }

  private tickRuntime(runtime: MatchRuntime): void {
    const result = runtime.session.advance()
    runtime.client?.sendTickResult(result)
  }

  private sendTickResult(result: ReturnType<GameSession['advance']>): void {
    for (const rejection of result.rejected) {
      this.sender.sendError(`${rejection.code}: ${rejection.message}`)
    }
    if (this.runtime !== null) {
      this.sender.sendSnapshot(this.runtime.session, result.events)
    }
  }

  private onMessage(raw: RawData): void {
    const decoded = decodeMessage(raw)
    if ('error' in decoded) {
      this.sender.sendError(decoded.error)
      return
    }
    try {
      this.handleParsed(decoded.value)
    } catch (error) {
      this.sender.sendError(error instanceof Error ? error.message : String(error))
    }
  }

  private handleParsed(parsed: unknown): void {
    if (this.lifecycle === 'closed' || (this.runtime !== null && this.runtime.client !== this)) {
      return
    }
    if (this.lifecycle === 'awaiting_request') {
      this.acceptRequest(parsed)
      return
    }
    if (isMatchRequest(parsed)) {
      this.sender.sendError('match_request already received')
      return
    }
    if (isSnapshotResyncRequest(parsed)) {
      if (this.runtime === null) {
        return
      }
      this.sender.reset()
      this.sender.sendSnapshot(this.runtime.session, [])
      return
    }
    if (isCommandMessage(parsed)) {
      this.schedule(parsed.intent)
      return
    }
    this.sender.sendError('invalid command message')
  }

  private acceptRequest(parsed: unknown): void {
    if (!isMatchRequest(parsed)) {
      this.sender.sendError('expected one valid match_request before commands')
      return
    }
    if (parsed.resumeToken !== undefined) {
      const runtime = MATCHES.get(parsed.resumeToken)
      if (runtime === undefined) {
        this.sender.sendError('unknown resume token')
        return
      }
      this.attach(runtime)
      return
    }
    const result = bootstrapMatch(parsed)
    if ('error' in result) {
      this.sender.sendErrorMessage(result.error)
      return
    }
    const runtime: MatchRuntime = {
      session: result.match.session,
      config: result.match.config,
      timer: null,
      expirationTimer: null,
      nextSequence: 1,
      client: null
    }
    MATCHES.set(result.match.config.resumeToken, runtime)
    this.attach(runtime)
    this.startTicker(runtime)
  }

  private attach(runtime: MatchRuntime): void {
    if (runtime.client !== null && runtime.client !== this) {
      runtime.client.supersede()
    }
    runtime.client = this
    this.runtime = runtime
    if (runtime.expirationTimer !== null) {
      clearTimeout(runtime.expirationTimer)
      runtime.expirationTimer = null
    }
    this.sender.reset()
    this.sender.sendMatchConfig(runtime.config)
    this.sender.sendSnapshot(runtime.session, [])
    this.lifecycle = 'running'
  }

  private supersede(): void {
    this.lifecycle = 'closed'
    this.runtime = null
    this.ws.close()
  }

  private close(): void {
    this.lifecycle = 'closed'
    if (this.runtime?.client === this) {
      this.runtime.client = null
      const runtime = this.runtime
      runtime.expirationTimer = setTimeout(() => this.expireRuntime(runtime), RECONNECT_GRACE_MS)
    }
  }

  private expireRuntime(runtime: MatchRuntime): void {
    if (runtime.client !== null || MATCHES.get(runtime.config.resumeToken) !== runtime) {
      return
    }
    runtime.session.submit(0, [
      {
        tick: runtime.session.tick() + 1,
        playerId: 0,
        sequence: runtime.nextSequence++,
        intent: { type: 'SURRENDER', payload: {} }
      }
    ])
    runtime.session.advance()
    if (runtime.timer !== null) {
      clearInterval(runtime.timer)
      runtime.timer = null
    }
    MATCHES.delete(runtime.config.resumeToken)
  }
}
