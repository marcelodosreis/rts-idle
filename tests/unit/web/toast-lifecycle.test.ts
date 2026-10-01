import { describe, expect, it } from 'vitest'
import { createToastScope, type ToastScopeDependencies } from '../../../apps/web/src/shared/ui/toast-scope'

function fakeToastDependencies(): {
  readonly dependencies: ToastScopeDependencies
  readonly dismissed: readonly (string | number)[]
  trigger(timer: ReturnType<typeof window.setTimeout>): void
} {
  let nextId = 0
  let nextTimer = 0
  const callbacks = new Map<ReturnType<typeof window.setTimeout>, () => void>()
  const dismissed: (string | number)[] = []
  return {
    dependencies: {
      create: () => {
        nextId += 1
        return nextId
      },
      dismiss: (id) => dismissed.push(id),
      setTimeout: (callback) => {
        nextTimer += 1
        callbacks.set(nextTimer, callback)
        return nextTimer
      },
      clearTimeout: () => undefined
    },
    dismissed,
    trigger: (timer) => callbacks.get(timer)?.()
  }
}

describe('match toast scope', () => {
  it('deduplicates within one session and allows the same key in the next session', () => {
    const first = fakeToastDependencies()
    const firstScope = createToastScope(first.dependencies)
    const firstId = firstScope.add({ dedupeKey: 'research:ECONOMY' })
    expect(firstScope.add({ dedupeKey: 'research:ECONOMY' })).toBe(firstId)
    firstScope.dispose()

    const next = fakeToastDependencies()
    expect(createToastScope(next.dependencies).add({ dedupeKey: 'research:ECONOMY' })).toBe(1)
    expect(first.dismissed).toEqual([firstId])
  })

  it('does not let an old expiry callback remove a replacement key', () => {
    const fake = fakeToastDependencies()
    const scope = createToastScope(fake.dependencies)
    const firstId = scope.add({ dedupeKey: 'construction:9' })
    scope.close(firstId)
    const replacementId = scope.add({ dedupeKey: 'construction:9' })

    fake.trigger(1)

    expect(scope.add({ dedupeKey: 'construction:9' })).toBe(replacementId)
  })
})
