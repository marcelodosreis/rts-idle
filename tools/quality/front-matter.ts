/**
 * Pure postmortem front-matter parser shared by the tracking tool and its
 * architecture test (single source of truth, no unsafe casts).
 */

export interface PostmortemFrontMatter {
  status: 'open' | 'closed'
  classe: string
  barreira: string | null
  regressao: string[]
}

export function parsePostmortemFrontMatter(content: string): PostmortemFrontMatter | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    return null
  }

  const frontMatter = match[1]
  if (frontMatter === undefined) {
    return null
  }
  const lines = frontMatter.split('\n')
  const fields = new Map<string, unknown>()
  let currentKey = ''
  let inArray = false

  for (const line of lines) {
    if (line.startsWith('  - ')) {
      const current = fields.get(currentKey)
      if (inArray && currentKey !== '' && Array.isArray(current)) {
        current.push(line.slice(4).trim())
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
      fields.set(key, [])
      currentKey = key
      inArray = true
      continue
    }
    if (value === 'null') {
      fields.set(key, null)
    } else if (value === 'open' || value === 'closed') {
      fields.set(key, value)
    } else {
      fields.set(key, value.replace(/^["']|["']$/g, ''))
    }
    currentKey = key
    inArray = false
  }

  const status = fields.get('status')
  if (status !== 'open' && status !== 'closed') {
    return null
  }
  const classe = fields.get('classe')
  const barreira = fields.get('barreira')
  const regressao = fields.get('regressao')
  return {
    status,
    classe: typeof classe === 'string' ? classe : '',
    barreira: typeof barreira === 'string' ? barreira : null,
    regressao: Array.isArray(regressao) ? regressao.filter((entry): entry is string => typeof entry === 'string') : []
  }
}
