import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const WORKSPACE_ROOT = process.cwd()
const TASKS_DIR = join(WORKSPACE_ROOT, 'docs', 'tasks')

interface TaskPacket {
  readonly id: string
  readonly path: string
}

function getQUALPackets(): readonly TaskPacket[] {
  return [TASKS_DIR, join(TASKS_DIR, 'done')].flatMap((directory) =>
    readdirSync(directory)
      .filter((file) => file.startsWith('QUAL-') && file.endsWith('.md'))
      .map((file) => ({
        id: file.replace('.md', ''),
        path: join(directory, file)
      }))
  )
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

function getTaskIndexTasks(): string[] {
  const content = readFileSync(join(WORKSPACE_ROOT, 'docs', 'ai', 'TASK_INDEX.md'), 'utf-8')
  const matches = content.matchAll(/^\| (QUAL-\d+) \|/gm)
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
    const packets = getQUALPackets().map((packet) => packet.id)
    const board = getBoardTasks()

    for (const packet of packets) {
      expect(board).toContain(packet)
    }
  })

  it('packets reference all board QUAL tasks', () => {
    const packets = getQUALPackets().map((packet) => packet.id)
    const board = getBoardTasks()

    for (const task of board) {
      expect(packets).toContain(task)
    }
  })

  it('TASK_INDEX references all board QUAL tasks', () => {
    const board = getBoardTasks()
    const taskIndex = getTaskIndexTasks()

    for (const task of board) {
      expect(taskIndex).toContain(task)
    }
  })

  it('TASK_INDEX has no duplicate QUAL ids', () => {
    const taskIndex = getTaskIndexTasks()
    const unique = new Set(taskIndex)
    expect(unique.size).toBe(taskIndex.length)
  })

  it('no duplicate QUAL ids in board', () => {
    const board = getBoardTasks()
    const unique = new Set(board)
    expect(unique.size).toBe(board.length)
  })

  it('packets have required fields', () => {
    const packets = getQUALPackets()

    for (const packet of packets) {
      const content = readFileSync(packet.path, 'utf-8')

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
