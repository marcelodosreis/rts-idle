import { spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { readPlan, selectGroup } from './plan-loader.js'
import { E2E_BROWSERS, type E2eBrowser, type E2eCategory } from './plan-types.js'
import { hasExplicitE2eScope } from './scope.js'

const rawArgs = process.argv.slice(2).filter((argument, index) => index !== 0 || argument !== '--')
const isSpecFile = (argument: string): boolean => {
  if (argument.startsWith('-') || !existsSync(argument)) {
    return false
  }
  return statSync(argument).isFile() && argument.endsWith('.spec.ts')
}

const planPath = findOption('--plan')
const groupId = findOption('--group')
const project = findOption('--project')
const args = rawArgs.filter((argument) => !argument.startsWith('--plan=') && !argument.startsWith('--group='))
const planned = planPath === undefined && groupId === undefined ? null : loadPlannedRun(planPath, groupId, project)
const playwrightArgs = [...args, ...(planned?.selectors ?? []), ...categoryArguments(planned?.category)]

if (!hasExplicitE2eScope(rawArgs, isSpecFile)) {
  console.error(
    'Refusing unscoped E2E run. Provide a .spec.ts file, --grep, or --project.\n' +
      'For focused tests use: pnpm run test:e2e:focused tests/e2e/<target>.spec.ts --list'
  )
  process.exit(2)
}

const result = spawnSync('playwright', ['test', ...playwrightArgs], { stdio: 'inherit' })
process.exit(result.status ?? 1)

function findOption(name: string): string | undefined {
  const prefix = `${name}=`
  return rawArgs.find((argument) => argument.startsWith(prefix))?.slice(prefix.length)
}

interface PlannedRun {
  readonly selectors: readonly string[]
  readonly category: E2eCategory
}

function loadPlannedRun(path: string | undefined, group: string | undefined, browser: string | undefined): PlannedRun {
  if (path === undefined || group === undefined) {
    throw new Error('planned E2E runs require --plan=<path> and --group=<id>')
  }
  if (!isBrowser(browser)) {
    throw new Error('planned E2E runs require --project=chromium|firefox')
  }
  const selected = selectGroup(readPlan(path), group, browser)
  return { selectors: selected.units.map((unit) => unit.id), category: selected.category }
}

function categoryArguments(category: E2eCategory | undefined): readonly string[] {
  if (category === undefined) {
    return []
  }
  return [category === 'performance' ? '--grep=@perf' : '--grep-invert=@perf']
}

function isBrowser(value: string | undefined): value is E2eBrowser {
  return value !== undefined && (E2E_BROWSERS as readonly string[]).includes(value)
}
