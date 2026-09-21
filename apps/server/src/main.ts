import { createServer } from 'node:http'
import { type ErrorMessage, isCommandMessage, isMatchRequest, type SnapshotMessage } from '@rts/protocol'
import type { CommandIntent, SimulationEvent } from '@rts/shared'
import { WebSocketServer } from 'ws'
import { bootstrapMatch } from './match-bootstrap.js'
import type { GameSession } from './sessions/session.js'

const PORT = Number(process.env.PORT ?? 8080)
const TICK_MS = 50

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('ok')
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (ws) => {
  // Each client gets its own isolated match. This mirrors the future
  // rooms architecture and keeps concurrent clients from mutating each
  // other's state (test isolation is a hard requirement).
  let session: GameSession | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let sequence = 1
  let lifecycle: 'awaiting_request' | 'running' | 'closed' = 'awaiting_request'

  const sendError = (error: ErrorMessage): void => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(error))
    }
  }

  const send = (events: readonly SimulationEvent[]): void => {
    if (session === null) {
      return
    }
    const message: SnapshotMessage = {
      type: 'snapshot',
      tick: session.snapshot().tick,
      phase: session.phase(),
      units: session.projectUnits(),
      buildings: session.projectBuildings(),
      mineralNodes: session.projectMineralNodes(),
      players: session.projectPlayers(),
      events
    }
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  /** Schedules the next command for the demo player (player 0) on the next tick. */
  const schedule = (intent: CommandIntent): void => {
    if (session === null) {
      return
    }
    session.submit(0, [{ tick: session.snapshot().tick + 1, playerId: 0, sequence: sequence++, intent }])
  }

  ws.on('message', (raw) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw.toString())
    } catch {
      sendError({ type: 'error', message: 'invalid JSON' })
      return
    }
    try {
      if (lifecycle === 'closed') {
        return
      }
      if (lifecycle === 'awaiting_request') {
        if (!isMatchRequest(parsed)) {
          sendError({ type: 'error', message: 'expected one valid match_request before commands' })
          return
        }
        const result = bootstrapMatch(parsed)
        if ('error' in result) {
          sendError(result.error)
          return
        }
        session = result.match.session
        ws.send(JSON.stringify(result.match.config))
        send([])
        lifecycle = 'running'
        timer = setInterval(() => {
          if (session === null) {
            return
          }
          const advanceResult = session.advance()
          for (const rejection of advanceResult.rejected) {
            sendError({ type: 'error', message: `${rejection.code}: ${rejection.message}` })
          }
          send(advanceResult.events)
        }, TICK_MS)
      } else if (isMatchRequest(parsed)) {
        sendError({ type: 'error', message: 'match_request already received' })
      } else if (isCommandMessage(parsed)) {
        schedule(parsed.intent)
      } else {
        sendError({ type: 'error', message: 'invalid command message' })
      }
    } catch (error) {
      sendError({ type: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  })

  ws.on('close', () => {
    lifecycle = 'closed'
    if (timer !== null) {
      clearInterval(timer)
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`demo server listening on http://localhost:${PORT} (tick every ${TICK_MS}ms, one session per client)`)
})
