import { type ChildProcess, spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { type DevelopmentPorts, instanceFromArgs, portsForInstance } from './ports.js'

const LOOPBACK_HOST = '127.0.0.1'

function pnpmCommand(): string {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
}

function portAvailable(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', () => reject(new Error(`Port ${port} is already in use or unavailable`)))
    server.listen({ port, host: LOOPBACK_HOST }, () => {
      server.close((error) => (error === undefined ? resolve() : reject(error)))
    })
  })
}

async function verifyPorts(ports: DevelopmentPorts): Promise<void> {
  await Promise.all([portAvailable(ports.serverPort), portAvailable(ports.webPort)])
}

function startProcess(args: readonly string[], environment: NodeJS.ProcessEnv): ChildProcess {
  return spawn(pnpmCommand(), args, { env: environment, stdio: 'inherit' })
}

function startDevelopmentProcess(ports: DevelopmentPorts): ChildProcess {
  return startProcess(['-r', '--parallel', '--filter', '@rts/server', '--filter', '@rts/web', 'run', 'dev'], {
    ...process.env,
    HOST: LOOPBACK_HOST,
    PORT: String(ports.webPort),
    RTS_SERVER_PORT: String(ports.serverPort),
    VITE_DEV_PORT: String(ports.webPort),
    VITE_SERVER_URL: `ws://${LOOPBACK_HOST}:${ports.serverPort}`
  })
}

function stopProcess(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve()
      return
    }
    child.once('close', () => resolve())
    if (child.pid === undefined) {
      resolve()
      return
    }
    if (globalThis.process.platform === 'win32') {
      child.kill('SIGTERM')
      return
    }
    child.kill('SIGTERM')
  })
}

async function run(instanceNumber: number): Promise<void> {
  const ports = portsForInstance(instanceNumber)
  await verifyPorts(ports)
  console.log(
    `Starting development instance ${instanceNumber}: web http://${LOOPBACK_HOST}:${ports.webPort}, server ${ports.serverPort}`
  )
  const developmentProcess = startDevelopmentProcess(ports)
  let stopping = false
  const stop = async (exitCode: number): Promise<void> => {
    if (stopping) {
      return
    }
    stopping = true
    await stopProcess(developmentProcess)
    globalThis.process.exitCode = exitCode
  }
  developmentProcess.once('exit', (code) => void stop(code ?? 1))
  process.once('SIGINT', () => void stop(0))
  process.once('SIGTERM', () => void stop(0))
}

const instance = instanceFromArgs(process.argv.slice(2))
run(instance).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unable to start development instance')
  process.exitCode = 1
})
