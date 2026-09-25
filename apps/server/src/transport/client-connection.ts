import { isCommandMessage, isMatchRequest } from '@rts/protocol'
import type { CommandIntent } from '@rts/shared'
import type { RawData, WebSocket } from 'ws'
import { bootstrapMatch } from '../bootstrap/match-bootstrap.js'
import type { GameSession } from '../sessions/session.js'
import { decodeMessage } from './message-decoder.js'
import { SnapshotSender } from './snapshot-sender.js'

export const TICK_MS = 50

type ConnectionLifecycle = 'awaiting_request' | 'running' | 'closed'

/** One isolated match per socket, mirroring the future rooms architecture. */
export class ClientConnection {
  private session: GameSession | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private sequence = 1
  private lifecycle: ConnectionLifecycle = 'awaiting_request'
  private readonly sender: SnapshotSender

  constructor(private readonly ws: WebSocket) {
    this.sender = new SnapshotSender(ws)
  }

  start(): void {
    this.ws.on('message', (raw) => this.onMessage(raw))
    this.ws.on('close', () => this.close())
  }

  private schedule(intent: CommandIntent): void {
    if (this.session === null) {
      return
    }
    this.session.submit(0, [{ tick: this.session.snapshot().tick + 1, playerId: 0, sequence: this.sequence++, intent }])
  }

  private startTicker(): void {
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  private tick(): void {
    if (this.session === null) {
      return
    }
    const result = this.session.advance()
    for (const rejection of result.rejected) {
      this.sender.sendError(`${rejection.code}: ${rejection.message}`)
    }
    this.sender.sendSnapshot(this.session, result.events)
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
    if (this.lifecycle === 'closed') {
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
    const result = bootstrapMatch(parsed)
    if ('error' in result) {
      this.sender.sendErrorMessage(result.error)
      return
    }
    this.session = result.match.session
    this.sender.sendMatchConfig(result.match.config)
    this.sender.sendSnapshot(this.session, [])
    this.lifecycle = 'running'
    this.startTicker()
  }

  private close(): void {
    this.lifecycle = 'closed'
    if (this.timer !== null) {
      clearInterval(this.timer)
    }
  }
}
