import { parseArgs } from './args.js'
import { runSimulationBenchmark } from './benchmark-simulation.js'
import { formatRow, renderHeader } from './format.js'

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
  console.log(renderHeader())
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
