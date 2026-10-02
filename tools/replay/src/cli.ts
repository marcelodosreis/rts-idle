import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { failureArtifact, parseReplay, ReplayDivergenceError, type ReplayDocument, runReplay } from './replay.js'

interface CliOptions {
  readonly file: string
  readonly validate: boolean
  readonly artifact?: string
}

function parseArgs(args: readonly string[]): CliOptions {
  const file = args.find((arg) => !arg.startsWith('--'))
  if (file === undefined) {
    throw new Error('usage: pnpm run replay -- [--validate] <file> [--artifact <path>]')
  }
  const artifactIndex = args.indexOf('--artifact')
  const artifact = artifactIndex >= 0 ? args[artifactIndex + 1] : undefined
  if (artifactIndex >= 0 && artifact === undefined) {
    throw new Error('--artifact requires a path')
  }
  return { file, validate: args.includes('--validate'), ...(artifact === undefined ? {} : { artifact }) }
}

async function readReplay(file: string): Promise<ReplayDocument> {
  const contents = await readFile(file, 'utf8')
  return parseReplay(JSON.parse(contents))
}

async function writeArtifact(path: string, document: ReplayDocument, error: unknown, tick: number, hash: string) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, failureArtifact(document, error, tick, hash), 'utf8')
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(args)
  const document = await readReplay(options.file)
  try {
    const result = runReplay(document, options.validate)
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } catch (error) {
    const tick = error instanceof ReplayDivergenceError ? error.lastValidTick : (document.initialSnapshot?.tick ?? 0)
    const hash =
      error instanceof ReplayDivergenceError ? error.lastValidHash : (document.initialSnapshot?.hash ?? 'unknown')
    if (options.artifact !== undefined) {
      await writeArtifact(options.artifact, document, error, tick, hash)
    }
    throw error
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
