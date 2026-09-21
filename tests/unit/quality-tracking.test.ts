import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const WORKSPACE_ROOT = process.cwd()
const TASKS_DIR = join(WORKSPACE_ROOT, 'tasks')

function getQUALPackets(): string[] {
  return readdirSync(TASKS_DIR)
    .filter((f) => f.startsWith('QUAL-') && f.endsWith('.md'))
    .map((f) => f.replace('.md', ''))
}

function getBoardTasks(): string[] {
  const content = readFileSync(join(TASKS_DIR, 'todo.md'), 'utf-8')
  const matches = content.matchAll(/- \[[ x]\] (QUAL-\d+)/g)
  const ids: string[] = []
  for (const m of matches) {
    ids.push(m[1])
  }
  return ids
}

describe('quality tracking (QUAL-018)', () => {
  it('has QUAL task packets', () => {
    const packets = getQUALPackets()
    expect(packets.length).toBeGreaterThanOrEqual(1)
  })

  it('board references all QUAL packets', () => {
    const packets = getQUALPackets()
    const board = getBoardTasks()

    for (const packet of packets) {
      expect(board).toContain(packet)
    }
  })

  it('packets reference all board QUAL tasks', () => {
    const packets = getQUALPackets()
    const board = getBoardTasks()

    for (const task of board) {
      expect(packets).toContain(task)
    }
  })

  it('no duplicate QUAL ids in board', () => {
    const board = getBoardTasks()
    const unique = new Set(board)
    expect(unique.size).toBe(board.length)
  })

  it('packets have required fields', () => {
    const packets = getQUALPackets()

    for (const packet of packets) {
      const content = readFileSync(join(TASKS_DIR, `${packet}.md`), 'utf-8')

      expect(content).toContain('**Status:**')
      expect(content).toContain('**Phase:**')
      expect(content).toContain('**Dependencies:**')
      expect(content).toContain('## Objective')
      expect(content).toContain('## Scope')
      expect(content).toContain('## Acceptance Criteria')
      expect(content).toContain('## Validation')
    }
  })
})
