import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const TASK_INDEX_PATH = join(process.cwd(), 'docs/ai/TASK_INDEX.md')

const CANONICAL_ID =
  /^(?:P\d+(?:A|B)?\.\d+(?:\.\d+)?|QH\.\d+(?:\.\d+)?|ARCH\.\d+(?:\.\d+)?|DEP\.\d+(?:\.\d+)?|SCL\.\d+(?:\.\d+)?|ED\.\d+(?:\.\d+)?|RESOURCE\.\d+(?:\.\d+)?)$/
const HISTORICAL_ID =
  /^(?:NAV|FOW|COMBAT|CONTENT|AI|ROOM|NET|EDITOR|QUAL|ECONOMY|BUILD|PROD|AUTH|VS|WEB-ARCH|INPUT|RFC-001-PR|DEPLOY|SCALE|E2E)-/

function taskIds(): string[] {
  return readFileSync(TASK_INDEX_PATH, 'utf-8')
    .split('\n')
    .map((line) => /^\| ([A-Z][A-Z0-9.]+) \|/.exec(line)?.[1] ?? null)
    .filter((id) => id !== 'ID')
    .filter((id): id is string => id !== null)
}

describe('task ID convention', () => {
  it('uses phase-first or explicit cross-cutting IDs in the active index', () => {
    for (const id of taskIds()) {
      expect(id, `invalid task ID: ${id}`).toMatch(CANONICAL_ID)
      expect(id, `historical task ID remains active: ${id}`).not.toMatch(HISTORICAL_ID)
    }
  })
})
