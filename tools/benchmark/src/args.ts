export interface CliOptions {
  readonly suite: string
  readonly entities: readonly number[]
  readonly steps: number
  readonly seed: number
}

const DEFAULT_STEPS = 200
const DEFAULT_SEED = 12345
const DEFAULT_ENTITIES = [100, 500, 1000, 2000, 5000, 10000]

/** Parses the benchmark CLI flags (`--suite`, `--entities`, `--steps`, `--seed`). */
export function parseArgs(args: readonly string[]): CliOptions {
  let suite = 'simulation'
  let entities: number[] = []
  let steps = DEFAULT_STEPS
  let seed = DEFAULT_SEED

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
    entities: entities.length > 0 ? entities : DEFAULT_ENTITIES,
    steps,
    seed
  }
}
