import { spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { readPlan, selectGroup } from './plan-loader.js'
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
const args = rawArgs.filter((argument) => !argument.startsWith('--plan=') && !argument.startsWith('--group='))
const plannedSelectors = planPath === undefined && groupId === undefined ? [] : loadPlannedSelectors(planPath, groupId)
const playwrightArgs = [...args, ...plannedSelectors]

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

function loadPlannedSelectors(path: string | undefined, group: string | undefined): string[] {
  if (path === undefined || group === undefined) {
    throw new Error('planned E2E runs require --plan=<path> and --group=<id>')
  }
  return selectGroup(readPlan(path), group).tests.map((test) => `${test.file}:${test.line}`)
}
