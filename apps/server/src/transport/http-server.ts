import { createServer, type Server } from 'node:http'

export function createHttpServer(): Server {
  return createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'text/plain' })
      response.end('ok')
      return
    }
    response.writeHead(404)
    response.end()
  })
}
