import { runSimulationBenchmark } from './benchmark-simulation.js'

interface CliOptions {
  readonly suite: string
  readonly entities: readonly number[]
  readonly steps: number
  readonly seed: number
}

function parseArgs(args: readonly string[]): CliOptions {
  let suite = 'simulation'
  let entities: number[] = []
  let steps = 200
  let seed = 12345

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    const next = args[i + 1]
    if (arg === '--suite' && next !== undefined) {
      suite = next
      i += 1
    } else if (arg === '--entities' && next !== undefined) {
      entities = next.split(',').map((v) => Number.parseInt(v, 10))
      i += 1
    } else if (arg === '--steps' && next !== undefined) {
      steps = Number.parseInt(next, 10)
      i += 1
    } else if (arg === '--seed' && next !== undefined) {
      seed = Number.parseInt(next, 10)
      i += 1
    }
  }

  return {
    suite,
    entities: entities.length > 0 ? entities : [100, 500, 1000, 2000, 5000, 10000],
    steps,
    seed
  }
}

function formatRow(row: ReturnType<typeof runSimulationBenchmark>['rows'][number]): string {
  const pad = (v: number): string => (v < 10 ? v.toFixed(3) : v.toFixed(1))
  return [
    String(row.entityCount).padStart(7),
    `${pad(row.avgMs)}`.padStart(8),
    `${pad(row.p50Ms)}`.padStart(8),
    `${pad(row.p95Ms)}`.padStart(8),
    `${pad(row.p99Ms)}`.padStart(8),
    `${pad(row.maxMs)}`.padStart(8),
    `${row.ticksPerSecond.toFixed(0)}`.padStart(8),
    `${row.cpuPercentAt20.toFixed(1)}%`.padStart(8),
    `${row.cpuPercentAt30.toFixed(1)}%`.padStart(8),
    `${row.cpuPercentAt60.toFixed(1)}%`.padStart(8),
    `${row.heapDeltaMiB.toFixed(1)}`.padStart(8),
    `${pad(row.hashMs)}`.padStart(8),
    `${pad(row.serializeMs)}`.padStart(8)
  ].join(' | ')
}

export async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))

  if (options.suite !== 'simulation') {
    throw new Error(`unknown suite "${options.suite}" (only "simulation" is implemented)`)
  }

  const result = runSimulationBenchmark(options.entities, options.steps, options.seed)

  console.log('=== Simulation benchmark ===')
  console.log(`hardware: ${result.hardware}`)
  console.log(
    `platform: ${result.platform} · node ${result.nodeVersion} · seed ${result.seed} · ${options.steps} steps`
  )
  console.log('')
  console.log(
    [
      'entities',
      'avg',
      'p50',
      'p95',
      'p99',
      'max',
      'tick/s',
      'cpu@20',
      'cpu@30',
      'cpu@60',
      'heapMiB',
      'hash',
      'serialize'
    ].join(' | ')
  )
  for (const row of result.rows) {
    console.log(formatRow(row))
  }
  console.log('')
  console.log('cpu@R = estimated single-core CPU (ms/s) when simulating at R ticks/s (step avg x R).')
  console.log('hash/serialize in ms per call; heapMiB = heap delta during the run.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
