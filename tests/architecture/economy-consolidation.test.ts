import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const simulation = (file: string): string => readFileSync(join(ROOT, 'packages/simulation/src/systems', file), 'utf8')

describe('economy consolidation boundaries', () => {
  it('keeps the economy orchestrator small and delegates cohesive responsibilities', () => {
    const orchestrator = simulation('economy-system.ts')
    expect(orchestrator).toContain('gatherDepositSystem')
    expect(orchestrator).toContain('constructionSystem')
    expect(orchestrator).toContain('repairSystem')
    expect(orchestrator.split('\n')).toHaveLength(12)
  })

  it('keeps repair resource-generic and producer selection data-driven', () => {
    const repair = simulation('repair-system.ts')
    const production = simulation('production-system.ts')
    expect(repair).toContain('canAfford')
    expect(repair).toContain('applyResourceCost')
    expect(repair).not.toContain("'GOLD'")
    expect(production).not.toContain("item.unitKind === 'pawn'")
    expect(production).not.toContain("building?.buildingType !== 'CASTLE'")
  })

  it('preserves the economy pipeline slot before combat', () => {
    const pipeline = readFileSync(join(ROOT, 'packages/simulation/src/systems/pipeline.ts'), 'utf8')
    expect(pipeline.indexOf("name: 'economy'")).toBeLessThan(pipeline.indexOf("name: 'combat'"))
    expect(pipeline.indexOf("name: 'movement'")).toBeLessThan(pipeline.indexOf("name: 'economy'"))
  })
})
