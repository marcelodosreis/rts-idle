import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const WORKSPACE_ROOT = process.cwd()
const RENDERER_PACKAGE_PATH = join(WORKSPACE_ROOT, 'packages/renderer/package.json')
const LOCKFILE_PATH = join(WORKSPACE_ROOT, 'pnpm-lock.yaml')

function rendererLockfileSpecifiers(lockfile: string): Record<string, string> {
  const importer = lockfile.match(/^ {2}packages\/renderer:\n {4}dependencies:\n((?: {6}.+\n| {8}.+\n)*)/m)
  expect(importer).not.toBeNull()

  return Object.fromEntries(
    [...importer![1].matchAll(/^ {6}('[^']+'|[^:]+):\n {8}specifier: (.+)$/gm)].map((match) => [
      match[1].replaceAll("'", ''),
      match[2]
    ])
  )
}

describe('renderer lockfile consistency', () => {
  it('matches the renderer manifest dependencies', () => {
    const manifest = JSON.parse(readFileSync(RENDERER_PACKAGE_PATH, 'utf8')) as {
      readonly dependencies: Record<string, string>
    }
    const lockfile = readFileSync(LOCKFILE_PATH, 'utf8')

    expect(rendererLockfileSpecifiers(lockfile)).toEqual(manifest.dependencies)
  })
})
