#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { aggregatePostmortemStatus } from './postmortem-status-data.js'
import { renderPostmortemStatus } from './postmortem-status-render.js'

const WORKSPACE_ROOT = process.cwd()
const POSTMORTEMS_DIR = join(WORKSPACE_ROOT, 'docs/postmortems')
const OUTPUT_PATH = join(WORKSPACE_ROOT, 'docs/quality/postmortem-status.md')

const files = readdirSync(POSTMORTEMS_DIR)
  .filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md')
  .sort()

const reportDate = new Date().toISOString().split('T')[0] ?? ''
const data = aggregatePostmortemStatus(
  files.map((file) => ({
    name: file.replace('.md', ''),
    content: readFileSync(join(POSTMORTEMS_DIR, file), 'utf-8')
  }))
)

writeFileSync(OUTPUT_PATH, renderPostmortemStatus(data, reportDate))
console.log(`Postmortem status written to ${OUTPUT_PATH}`)
console.log(`  open: ${data.openCount}, closed: ${data.closedCount}, total: ${data.entries.length}`)
