import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parsePostmortemFrontMatter } from '../../tools/quality/front-matter.js'

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
      const fm = parsePostmortemFrontMatter(content)

      it('has valid front-matter', () => {
        expect(fm).not.toBeNull()
      })

      if (!fm) {
        return
      }

      it('has status open or closed', () => {
        expect(['open', 'closed']).toContain(fm.status)
      })

      it('has a valid class', () => {
        expect(VALID_CLASSES).toContain(fm.classe)
      })

      it('has a barrier (string or null)', () => {
        expect(fm.barreira === null || typeof fm.barreira === 'string').toBe(true)
      })

      it('has regression metadata as an array', () => {
        expect(Array.isArray(fm.regressao)).toBe(true)
      })

      if (fm.status === 'closed') {
        it('has regression test files (closed requires regression)', () => {
          expect(fm.regressao.length).toBeGreaterThanOrEqual(1)
        })
      }

      if (fm.barreira !== null) {
        it('the barrier matches the QUAL-xxx pattern', () => {
          expect(fm.barreira).toMatch(/^QUAL-\d+$/)
        })

        it('the barrier QUAL id exists in TASK_INDEX', () => {
          const qualIds = getQUALIds()
          expect(qualIds.has(fm.barreira!)).toBe(true)
        })
      }

      if (fm.regressao.length > 0) {
        it('regression files exist on disk', () => {
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
      const fm = parsePostmortemFrontMatter(content)
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
