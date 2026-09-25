import { WebSocketServer } from 'ws'
import { ClientConnection, TICK_MS } from './transport/client-connection.js'
import { createHttpServer } from './transport/http-server.js'

const { PORT = '8080' } = process.env
const SERVER_PORT = Number(PORT)

const httpServer = createHttpServer()

const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (ws) => {
  new ClientConnection(ws).start()
})

httpServer.listen(SERVER_PORT, () => {
  console.log(
    `demo server listening on http://localhost:${SERVER_PORT} (tick every ${TICK_MS}ms, one session per client)`
  )
})
