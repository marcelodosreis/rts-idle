import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SIMULATION_ROOT = join(process.cwd(), 'packages', 'simulation', 'src')

const FORBIDDEN = [
  'react',
  'phaser',
  'pixi.js',
  'pixi-viewport',
  'ws',
  'node:',
  'zod',
  '@rts/protocol',
  '@rts/renderer',
  '@rts/ai'
]

function collectTsFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      out.push(...collectTsFiles(full))
    } else if (entry.endsWith('.ts')) {
      out.push(full)
    }
  }
  return out
}

describe('simulation isolation barrier', () => {
  const files = collectTsFiles(SIMULATION_ROOT)

  it('simulation package has source files', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const file of files) {
    it(`forbids platform imports in ${file.replace(`${SIMULATION_ROOT}/`, '')}`, () => {
      const content = readFileSync(file, 'utf8')
      for (const forbidden of FORBIDDEN) {
        expect(content).not.toMatch(new RegExp(`from ['"]${forbidden}`))
      }
    })
  }
})
