import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { mergeTimings } from './timing-history.js'

const inputDirectory = readOption('--input')
const outputPath = readOption('--output')

if (inputDirectory === undefined || outputPath === undefined) {
  throw new Error('timing collection requires --input=<directory> and --output=<file>')
}

const values = listJsonFiles(inputDirectory).map((path) => JSON.parse(readFileSync(path, 'utf8')))

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(mergeTimings(values), null, 2)}\n`, 'utf8')

function readOption(name: string): string | undefined {
  const prefix = `${name}=`
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length)
}

function listJsonFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return listJsonFiles(path)
    }
    return entry.isFile() && entry.name.endsWith('.json') ? [path] : []
  })
}
