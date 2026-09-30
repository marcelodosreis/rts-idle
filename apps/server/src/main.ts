import { WebSocketServer } from 'ws'
import { ClientConnection, TICK_MS } from './transport/client-connection.js'
import { createHttpServer } from './transport/http-server.js'

const { HOST, PORT = '8080', RTS_SERVER_PORT } = process.env
const SERVER_PORT = Number(RTS_SERVER_PORT ?? PORT)

const httpServer = createHttpServer()

const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (ws) => {
  new ClientConnection(ws).start()
})

function onListening(): void {
  console.log(
    `demo server listening on http://localhost:${SERVER_PORT} (tick every ${TICK_MS}ms, one session per client)`
  )
}

if (HOST === undefined) {
  httpServer.listen(SERVER_PORT, onListening)
} else {
  httpServer.listen(SERVER_PORT, HOST, onListening)
}
