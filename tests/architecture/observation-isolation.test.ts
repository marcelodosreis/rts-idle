import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(process.cwd(), 'apps', 'server', 'src')

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) {
      return sourceFiles(path)
    }
    return entry.endsWith('.ts') ? [path] : []
  })
}

describe('server observation isolation', () => {
  it('keeps server transport on the simulation observation boundary', () => {
    const violations: string[] = []
    for (const file of sourceFiles(ROOT)) {
      const source = readFileSync(file, 'utf8')
      if (/simulation\/src|inspectState\(|GameState/.test(source)) {
        violations.push(file)
      }
    }
    expect(violations).toEqual([])
  })
})
