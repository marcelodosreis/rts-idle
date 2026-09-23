import { readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = resolve(new URL('../../apps/web/src', import.meta.url).pathname)
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx'])

type Layer = 'app' | 'pages' | 'features' | 'entities' | 'shared' | 'other'

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return sourceFiles(path)
    }
    return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : []
  })
}

function layerOf(path: string): Layer {
  const relativePath = relative(SRC, path)
  const [layer] = relativePath.split('/')
  return layer === 'app' || layer === 'pages' || layer === 'features' || layer === 'entities' || layer === 'shared'
    ? layer
    : 'other'
}

function domainOf(path: string): string | null {
  const relativePath = relative(SRC, path).split('/')
  if (relativePath[0] === 'pages' || relativePath[0] === 'features' || relativePath[0] === 'entities') {
    return relativePath[1] ?? null
  }
  return null
}

function resolveSourceImport(from: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) {
    return resolve(SRC, specifier.slice(2))
  }
  if (!specifier.startsWith('.')) {
    return null
  }
  const base = resolve(dirname(from), specifier)
  const normalizedBase = base.endsWith('.js') ? base.slice(0, -3) : base
  for (const candidate of [
    normalizedBase,
    `${normalizedBase}.ts`,
    `${normalizedBase}.tsx`,
    join(normalizedBase, 'index.ts'),
    join(normalizedBase, 'index.tsx')
  ]) {
    try {
      if (
        SOURCE_EXTENSIONS.has(extname(candidate)) ||
        candidate.endsWith('/index.ts') ||
        candidate.endsWith('/index.tsx')
      ) {
        readFileSync(candidate)
        return candidate
      }
    } catch {
      // Continue through the extension candidates.
    }
  }
  return null
}

function violates(from: string, target: string): boolean {
  const fromLayer = layerOf(from)
  const targetLayer = layerOf(target)
  if (fromLayer === 'other') {
    return false
  }
  if (targetLayer === 'other') {
    return false
  }
  if (fromLayer === 'app') {
    return false
  }
  if (fromLayer === 'pages') {
    return (
      targetLayer === 'app' ||
      targetLayer === 'pages' ||
      (targetLayer === 'features' && domainOf(from) !== domainOf(target))
    )
  }
  if (fromLayer === 'features') {
    return (
      targetLayer === 'app' ||
      targetLayer === 'pages' ||
      (targetLayer === 'features' && domainOf(from) !== domainOf(target))
    )
  }
  if (fromLayer === 'entities') {
    return targetLayer === 'app' || targetLayer === 'pages' || targetLayer === 'features'
  }
  return targetLayer !== 'shared'
}

describe('web import boundaries', () => {
  it('keeps imports moving from app toward shared without cross-domain deep imports', () => {
    const violations: string[] = []
    for (const file of sourceFiles(SRC)) {
      const source = readFileSync(file, 'utf8')
      const imports = source.matchAll(/(?:from|import\()\s*["']([^"']+)["']/g)
      for (const match of imports) {
        const specifier = match[1]
        if (specifier === undefined) {
          continue
        }
        const target = resolveSourceImport(file, specifier)
        if (target !== null && violates(file, target)) {
          violations.push(`${relative(SRC, file)} -> ${specifier}`)
        }
      }
    }
    expect(violations).toEqual([])
  })
})
