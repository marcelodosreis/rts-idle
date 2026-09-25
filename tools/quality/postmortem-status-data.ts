import { type PostmortemFrontMatter, parsePostmortemFrontMatter } from './front-matter.js'

export interface PostmortemSource {
  name: string
  content: string
}

export interface PostmortemStatusEntry {
  name: string
  frontMatter: PostmortemFrontMatter
}

export interface PostmortemStatusData {
  entries: PostmortemStatusEntry[]
  openCount: number
  closedCount: number
}

export function aggregatePostmortemStatus(sources: readonly PostmortemSource[]): PostmortemStatusData {
  const entries: PostmortemStatusEntry[] = []
  let openCount = 0
  let closedCount = 0

  for (const source of sources) {
    const frontMatter = parsePostmortemFrontMatter(source.content)
    if (!frontMatter) {
      continue
    }
    entries.push({ name: source.name, frontMatter })
    if (frontMatter.status === 'open') {
      openCount++
    }
    if (frontMatter.status === 'closed') {
      closedCount++
    }
  }

  return { entries, openCount, closedCount }
}
