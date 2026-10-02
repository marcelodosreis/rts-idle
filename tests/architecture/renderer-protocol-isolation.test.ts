import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(process.cwd(), 'packages', 'renderer', 'src')

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) {
      return sourceFiles(path)
    }
    return entry.endsWith('.ts') ? [path] : []
  })
}

describe('renderer protocol isolation', () => {
  it('keeps wire messages outside the renderer package', () => {
    const imports = sourceFiles(ROOT).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/from\s+["'](@rts\/protocol)["']/g)].map(() => file)
    )
    expect(imports).toEqual([])
  })
})
