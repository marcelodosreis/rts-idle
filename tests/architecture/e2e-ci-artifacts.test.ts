import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const WORKFLOW_PATH = new URL('../../.github/workflows/ci.yml', import.meta.url)

describe('E2E CI preparation', () => {
  it('downloads built package artifacts before discovering tests', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8')
    const prepareStart = workflow.indexOf('  prepare_e2e:')
    const functionalStart = workflow.indexOf('\n  e2e_functional:', prepareStart)
    const prepareJob = workflow.slice(prepareStart, functionalStart)
    const distDownload = prepareJob.indexOf('name: dist')
    const planGeneration = prepareJob.indexOf('name: Generate E2E plan')

    expect(prepareStart).toBeGreaterThanOrEqual(0)
    expect(functionalStart).toBeGreaterThan(prepareStart)
    expect(distDownload).toBeGreaterThanOrEqual(0)
    expect(planGeneration).toBeGreaterThan(distDownload)
  })
})
