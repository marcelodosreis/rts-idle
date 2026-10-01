import { parseArgs } from './args.js'
import { formatRow, renderHeader } from './format.js'
import { measureResourceRow } from './resources.js'
import { runSimulationBenchmark } from './simulation.js'

export async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))

  if (options.suite === 'resources') {
    console.log('=== Resource benchmark ===')
    console.log(
      'resources | ecs entities | create ms | idle tick ms | nearest lookup ms | delta idle ms (n) | delta 1 ms (n) | delta small ms (n) | depletion ms | full snapshot bytes | full snapshot ms'
    )
    for (const count of options.entities) {
      const row = measureResourceRow(count, options.seed)
      console.log(
        `${row.resourceCount} | ${row.ecsEntityCount} | ${row.createMs.toFixed(3)} | ${row.idleTickMs.toFixed(4)} | ${row.lookupMs.toFixed(4)} | ${row.deltaIdleMs.toFixed(4)} (${row.deltaIdleCount}) | ${row.deltaOneMs.toFixed(4)} (${row.deltaOneCount}) | ${row.deltaSmallMs.toFixed(4)} (${row.deltaSmallCount}) | ${row.depletionMs.toFixed(4)} | ${row.snapshotBytes} | ${row.snapshotMs.toFixed(3)}`
      )
    }
    return
  }
  if (options.suite !== 'simulation') {
    throw new Error(`unknown suite "${options.suite}" (use "simulation" or "resources")`)
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
