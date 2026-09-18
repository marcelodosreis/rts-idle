import { createServer } from 'node:http'
import { type ErrorMessage, isCommandMessage, isMoveMessage, type SnapshotMessage } from '@rts/protocol'
import type { CommandIntent, SimulationEvent } from '@rts/shared'
import { WebSocketServer } from 'ws'
import { createDemoSession } from './demo.js'

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
  const session = createDemoSession()
  let sequence = 1

  const sendError = (message: string): void => {
    const error: ErrorMessage = { type: 'error', message }
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(error))
    }
  }

  const send = (events: readonly SimulationEvent[]): void => {
    const message: SnapshotMessage = {
      type: 'snapshot',
      tick: session.snapshot().tick,
      phase: session.phase(),
      units: session.projectUnits(),
      players: session.projectPlayers(),
      events
    }
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  /** Schedules the next command for the demo player (player 0) on the next tick. */
  const schedule = (intent: CommandIntent): void => {
    session.submit(0, [{ tick: session.snapshot().tick + 1, playerId: 0, sequence: sequence++, intent }])
  }

  send([])
  const timer = setInterval(() => {
    const result = session.advance()
    send(result.events)
  }, TICK_MS)

  ws.on('message', (raw) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw.toString())
    } catch {
      sendError('invalid JSON')
      return
    }
    try {
      if (isCommandMessage(parsed)) {
        schedule(parsed.intent)
      } else if (isMoveMessage(parsed)) {
        // Legacy MOVE transport: keep working for old clients and fixtures.
        schedule({ type: 'MOVE', payload: { unitIds: parsed.unitIds, x: parsed.x, y: parsed.y } })
      }
    } catch (error) {
      sendError(error instanceof Error ? error.message : String(error))
    }
  })

  ws.on('close', () => {
    clearInterval(timer)
  })
})

httpServer.listen(PORT, () => {
  console.log(`demo server listening on http://localhost:${PORT} (tick every ${TICK_MS}ms, one session per client)`)
})
