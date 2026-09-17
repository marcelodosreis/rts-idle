import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'
import { createDemoSession } from './demo.js'

const PORT = Number(process.env.PORT ?? 8080)
const TICK_MS = 50

interface MoveMessage {
  readonly type: 'MOVE'
  readonly unitIds: readonly number[]
  readonly x: number
  readonly y: number
}

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

  const send = (): void => {
    const units = session.projectUnits()
    const message = JSON.stringify({ type: 'snapshot', tick: session.snapshot().tick, units })
    if (ws.readyState === ws.OPEN) {
      ws.send(message)
    }
  }

  send()
  const timer = setInterval(() => {
    session.advance()
    send()
  }, TICK_MS)

  ws.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString()) as MoveMessage
      if (message.type === 'MOVE') {
        session.submit(0, [
          {
            tick: session.snapshot().tick + 1,
            playerId: 0,
            sequence: sequence++,
            intent: { type: 'MOVE', payload: { unitIds: message.unitIds, x: message.x, y: message.y } }
          }
        ])
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : String(error) }))
    }
  })

  ws.on('close', () => {
    clearInterval(timer)
  })
})

httpServer.listen(PORT, () => {
  console.log(`demo server listening on http://localhost:${PORT} (tick every ${TICK_MS}ms, one session per client)`)
})
