import { spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { hasExplicitE2eScope } from './scope.js'

const args = process.argv.slice(2).filter((argument, index) => index !== 0 || argument !== '--')
const isSpecFile = (argument: string): boolean => {
  if (argument.startsWith('-') || !existsSync(argument)) {
    return false
  }
  return statSync(argument).isFile() && argument.endsWith('.spec.ts')
}

if (!hasExplicitE2eScope(args, isSpecFile)) {
  console.error(
    'Refusing unscoped E2E run. Provide a .spec.ts file, --grep, or --project.\n' +
      'For focused tests use: pnpm run test:e2e:focused tests/e2e/<target>.spec.ts --list'
  )
  process.exit(2)
}

const result = spawnSync('playwright', ['test', ...args], { stdio: 'inherit' })
process.exit(result.status ?? 1)
