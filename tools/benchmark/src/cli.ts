import { parseArgs } from './args.js'
import { runEcsQueryBenchmark } from './ecs-query.js'
import { formatRow, renderHeader } from './format.js'
import { measureResourceRow } from './resources.js'
import { runSimulationBenchmark } from './simulation.js'
import { runSnapshotDeltaBenchmark } from './snapshot-delta.js'

function runResourceBenchmark(options: ReturnType<typeof parseArgs>): void {
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
}

function runEcsQuery(options: ReturnType<typeof parseArgs>): void {
  const rows = runEcsQueryBenchmark(undefined, options.steps, options.repetitions, options.seed)
  console.log('=== ECS query benchmark ===')
  console.log(
    `seed: ${options.seed} · warmup: 20 steps · measurement: ${options.steps} steps · repetitions: ${options.repetitions}`
  )
  console.log(
    'scenario | units | median avg | median p50 | median p95 | median p99 | median max | median ticks/s | median heapMiB | alive calls | alive rebuilds | queries | component rebuilds | candidates | combat checks (instrumentation pass)'
  )
  for (const row of rows) {
    console.log(
      [
        row.scenario,
        row.units,
        row.medianAvgMs.toFixed(4),
        row.medianP50Ms.toFixed(4),
        row.medianP95Ms.toFixed(4),
        row.medianP99Ms.toFixed(4),
        row.medianMaxMs.toFixed(4),
        row.medianTicksPerSecond.toFixed(2),
        row.medianHeapDeltaMiB.toFixed(4),
        row.aliveIdsCalls.toFixed(0),
        row.aliveIdsRebuilds.toFixed(0),
        row.queryCalls.toFixed(0),
        row.componentIdsRebuilds.toFixed(0),
        row.queryCandidatesVisited.toFixed(0),
        row.combatCandidateChecks.toFixed(0)
      ].join(' | ')
    )
  }
}

function runSimulation(options: ReturnType<typeof parseArgs>): void {
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

function runSnapshotDelta(options: ReturnType<typeof parseArgs>): void {
  const result = runSnapshotDeltaBenchmark(options.entities[0], options.repetitions)
  console.log('=== Snapshot delta benchmark ===')
  console.log(`entities: ${result.entityCount} · repetitions: ${result.repetitions}`)
  console.log(
    `idle changed entities: ${result.idleChangedEntities} · observation ms: ${result.idleObservationMs.toFixed(3)}`
  )
  console.log(
    `active changed entities: ${result.activeChangedEntities} · observation ms: ${result.activeObservationMs.toFixed(3)}`
  )
}

export async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))

  if (options.suite === 'resources') {
    runResourceBenchmark(options)
    return
  }
  if (options.suite === 'ecs-query') {
    runEcsQuery(options)
    return
  }
  if (options.suite === 'snapshot-delta') {
    runSnapshotDelta(options)
    return
  }
  if (options.suite !== 'simulation') {
    throw new Error(
      `unknown suite "${options.suite}" (use "simulation", "resources", "ecs-query", or "snapshot-delta")`
    )
  }
  runSimulation(options)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
