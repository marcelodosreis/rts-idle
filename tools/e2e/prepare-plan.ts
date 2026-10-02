import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { discoverTests } from './discover-tests.js'
import { E2E_BROWSERS, E2E_CATEGORIES, type E2ePlan } from './plan-types.js'
import { planGroups } from './planner.js'
import { estimateTests, readTimingHistory } from './timing-history.js'

const outputPath = readOption('--output') ?? 'tmp/e2e-plan.json'
const historyPath = readOption('--history')
const history = readTimingHistory(historyPath === undefined || !existsSync(historyPath) ? null : readJson(historyPath))

const groups = E2E_CATEGORIES.flatMap((category) =>
  E2E_BROWSERS.flatMap((browser) => {
    const discovered = discoverTests(category, browser)
    const estimated = estimateTests(discovered, history)
    return planGroups(estimated, { category, browser })
  })
)

const plan: E2ePlan = { version: 1, generatedAt: new Date().toISOString(), groups }
mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8')

function readOption(name: string): string | undefined {
  const prefix = `${name}=`
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix))
  return argument?.slice(prefix.length)
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}
