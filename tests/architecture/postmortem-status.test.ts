import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const WORKSPACE_ROOT = process.cwd()
const POSTMORTEMS_DIR = join(WORKSPACE_ROOT, 'docs/postmortems')
const TASK_INDEX_PATH = join(WORKSPACE_ROOT, 'docs/ai/TASK_INDEX.md')

const VALID_CLASSES = [
  'presentation',
  'input-geometry',
  'input-cross-platform',
  'layout',
  'isolation',
  'convention',
  'completion-gate',
  'coverage',
  'process-branch',
  'formation',
  'environment',
  'serialization'
] as const

interface FrontMatter {
  status: 'open' | 'closed'
  classe: string
  barreira: string | null
  regressao: string[]
}

function parseFrontMatter(content: string): FrontMatter | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    return null
  }

  const yaml = match[1]
  const lines = yaml.split('\n')
  const result: Record<string, unknown> = {}
  let currentKey = ''
  let inArray = false

  for (const line of lines) {
    if (line.startsWith('  - ')) {
      if (inArray && currentKey) {
        const arr = result[currentKey] as string[]
        arr.push(line.slice(4).trim())
      }
      continue
    }

    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) {
      continue
    }

    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()

    if (value === '' || value === '[]') {
      currentKey = key
      inArray = true
      result[key] = []
      continue
    }

    if (value === 'null') {
      result[key] = null
      currentKey = key
      inArray = false
      continue
    }

    if (value === 'open' || value === 'closed') {
      result[key] = value
      currentKey = key
      inArray = false
      continue
    }

    result[key] = value.replace(/^["']|["']$/g, '')
    currentKey = key
    inArray = false
  }

  return {
    status: result.status as 'open' | 'closed',
    classe: result.classe as string,
    barreira: result.barreira as string | null,
    regressao: (result.regressao as string[]) ?? []
  }
}

function getPostmortemFiles(): string[] {
  return readdirSync(POSTMORTEMS_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md')
    .map((f) => join(POSTMORTEMS_DIR, f))
}

function getQUALIds(): Set<string> {
  const content = readFileSync(TASK_INDEX_PATH, 'utf-8')
  const ids = new Set<string>()
  const matches = content.matchAll(/^###? \|?(QUAL-\d+)/gm)
  for (const m of matches) {
    ids.add(m[1])
  }
  const matches2 = content.matchAll(/QUAL-\d+/g)
  for (const m of matches2) {
    ids.add(m[0])
  }
  return ids
}

describe('postmortem status (QUAL-017)', () => {
  const files = getPostmortemFiles()

  it('has postmortems to validate', () => {
    expect(files.length).toBeGreaterThanOrEqual(1)
  })

  for (const file of files) {
    const name = file.split('/').pop()!

    describe(name, () => {
      const content = readFileSync(file, 'utf-8')
      const fm = parseFrontMatter(content)

      it('has valid front-matter', () => {
        expect(fm).not.toBeNull()
      })

      if (!fm) {
        return
      }

      it('has status open or closed', () => {
        expect(['open', 'closed']).toContain(fm.status)
      })

      it('has valid classe', () => {
        expect(VALID_CLASSES).toContain(fm.classe)
      })

      it('has barreira (string or null)', () => {
        expect(fm.barreira === null || typeof fm.barreira === 'string').toBe(true)
      })

      it('has regressao as array', () => {
        expect(Array.isArray(fm.regressao)).toBe(true)
      })

      if (fm.status === 'closed') {
        it('has regressao test files (closed requires regression)', () => {
          expect(fm.regressao.length).toBeGreaterThanOrEqual(1)
        })
      }

      if (fm.barreira !== null) {
        it('barreira matches QUAL-xxx pattern', () => {
          expect(fm.barreira).toMatch(/^QUAL-\d+$/)
        })

        it('barreira QUAL id exists in TASK_INDEX', () => {
          const qualIds = getQUALIds()
          expect(qualIds.has(fm.barreira!)).toBe(true)
        })
      }

      if (fm.regressao.length > 0) {
        it('regressao files exist on disk', () => {
          for (const testPath of fm.regressao) {
            const fullPath = join(WORKSPACE_ROOT, testPath)
            expect(existsSync(fullPath), `missing: ${testPath}`).toBe(true)
          }
        })
      }
    })
  }

  it('no duplicate postmortem ids', () => {
    const ids = files.map((f) => f.split('/').pop()!.replace('.md', ''))
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
})

describe('postmortem status summary', () => {
  it('generates consistent summary', () => {
    const files = getPostmortemFiles()
    let open = 0
    let closed = 0

    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      const fm = parseFrontMatter(content)
      if (fm?.status === 'open') {
        open++
      }
      if (fm?.status === 'closed') {
        closed++
      }
    }

    expect(open + closed).toBe(files.length)
    expect(open).toBeGreaterThanOrEqual(0)
    expect(closed).toBeGreaterThanOrEqual(0)
  })
})
