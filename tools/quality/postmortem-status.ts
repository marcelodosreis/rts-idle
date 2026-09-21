#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const WORKSPACE_ROOT = process.cwd()
const POSTMORTEMS_DIR = join(WORKSPACE_ROOT, 'docs/postmortems')
const OUTPUT_PATH = join(WORKSPACE_ROOT, 'docs/quality/postmortem-status.md')

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

const files = readdirSync(POSTMORTEMS_DIR)
  .filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md')
  .sort()

const entries: Array<{ name: string; fm: FrontMatter }> = []
let openCount = 0
let closedCount = 0

for (const file of files) {
  const content = readFileSync(join(POSTMORTEMS_DIR, file), 'utf-8')
  const fm = parseFrontMatter(content)
  if (!fm) {
    continue
  }
  entries.push({ name: file.replace('.md', ''), fm })
  if (fm.status === 'open') {
    openCount++
  }
  if (fm.status === 'closed') {
    closedCount++
  }
}

const lines: string[] = [
  '# Postmortem Status',
  '',
  `> Gerado automaticamente por \`tools/quality/postmortem-status.ts\``,
  `> Atualizado: ${new Date().toISOString().split('T')[0]}`,
  '',
  '## Resumo',
  '',
  `| Status | Quantidade |`,
  `|--------|------------|`,
  `| open | ${openCount} |`,
  `| closed | ${closedCount} |`,
  `| **total** | **${entries.length}** |`,
  '',
  '## Detalhes',
  '',
  '| Postmortem | Status | Classe | Barreira | Regressão |',
  '|------------|--------|--------|----------|-----------|'
]

for (const { name, fm } of entries) {
  const statusIcon = fm.status === 'closed' ? 'closed' : 'open'
  const barrier = fm.barreira ?? '—'
  const regression = fm.regressao.length > 0 ? `${fm.regressao.length} teste(s)` : 'nenhum'
  lines.push(`| ${name} | ${statusIcon} | ${fm.classe} | ${barrier} | ${regression} |`)
}

lines.push('')
lines.push('## Legenda')
lines.push('')
lines.push('- **open** = bug corrigido, mas pode acontecer de novo (sem barreira de classe)')
lines.push('- **closed** = bug corrigido E barreira de classe existe (não volta mais)')
lines.push('- **Barreira** = QUAL que fornece a barreira de classe')
lines.push('- **Regressão** = teste(s) permanente(s) que validam o fix')
lines.push('')

writeFileSync(OUTPUT_PATH, lines.join('\n'))
console.log(`Postmortem status written to ${OUTPUT_PATH}`)
console.log(`  open: ${openCount}, closed: ${closedCount}, total: ${entries.length}`)
