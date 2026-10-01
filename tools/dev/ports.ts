export interface DevelopmentPorts {
  readonly serverPort: number
  readonly webPort: number
}

const SERVER_BASE_PORT = 8080
const WEB_BASE_PORT = 5173
const INSTANCE_USAGE = 'Usage: pnpm dev:instance -- <positive instance number>'

function assertPositiveInstance(instance: number): void {
  if (!Number.isSafeInteger(instance) || instance < 1) {
    throw new Error('Development instance must be a positive integer')
  }
}

export function instanceFromArgs(args: readonly string[]): number {
  const normalizedArgs = args[0] === '--' ? args.slice(1) : args
  if (normalizedArgs.length === 0) {
    return 1
  }
  if (normalizedArgs.length !== 1 || normalizedArgs[0] === undefined) {
    throw new Error(INSTANCE_USAGE)
  }
  const instance = Number(normalizedArgs[0])
  assertPositiveInstance(instance)
  return instance
}

export function portsForInstance(instance: number): DevelopmentPorts {
  assertPositiveInstance(instance)
  const offset = instance - 1
  const serverPort = SERVER_BASE_PORT + offset
  const webPort = WEB_BASE_PORT + offset
  if (serverPort > 65_535 || webPort > 65_535) {
    throw new Error(`Development instance ${instance} exceeds the available port range`)
  }
  return { serverPort, webPort }
}
