export interface ToastActionProps {
  readonly children: string
  readonly onClick: () => void
}

export type ToastType = 'default' | 'success' | 'info' | 'warning' | 'error'

export interface ToastOptions {
  readonly title?: string
  readonly description?: string
  readonly type?: ToastType
  readonly priority?: 'normal' | 'high'
  readonly actionProps?: ToastActionProps
  readonly dedupeKey?: string
}

export interface ToastScope {
  add(options: ToastOptions): string | number
  close(id: string | number): void
  dispose(): void
}

interface ScopedToast {
  readonly id: string | number
  readonly timer: ReturnType<typeof window.setTimeout>
}

export interface ToastScopeDependencies {
  readonly create: (options: ToastOptions) => string | number
  readonly dismiss: (id: string | number) => void
  readonly setTimeout: (callback: () => void, duration: number) => ReturnType<typeof window.setTimeout>
  readonly clearTimeout: (timer: ReturnType<typeof window.setTimeout>) => void
}

function toastDuration(options: ToastOptions): number {
  return options.priority === 'high' ? 4500 : 3250
}

export function createToastScope(dependencies: ToastScopeDependencies): ToastScope {
  const scopedToasts = new Map<string, ScopedToast>()
  const ownedIds = new Set<string | number>()

  const close = (id: string | number): void => {
    dependencies.dismiss(id)
    ownedIds.delete(id)
    for (const [key, scoped] of scopedToasts) {
      if (scoped.id === id) {
        dependencies.clearTimeout(scoped.timer)
        scopedToasts.delete(key)
      }
    }
  }

  return {
    add(options) {
      const existing = options.dedupeKey === undefined ? undefined : scopedToasts.get(options.dedupeKey)
      if (existing !== undefined) {
        return existing.id
      }

      const id = dependencies.create(options)
      ownedIds.add(id)
      if (options.dedupeKey !== undefined) {
        const timer = dependencies.setTimeout(() => {
          const scoped = scopedToasts.get(options.dedupeKey!)
          if (scoped?.id === id) {
            scopedToasts.delete(options.dedupeKey!)
            ownedIds.delete(id)
          }
        }, toastDuration(options))
        scopedToasts.set(options.dedupeKey, { id, timer })
      }
      return id
    },
    close,
    dispose() {
      for (const { timer } of scopedToasts.values()) {
        dependencies.clearTimeout(timer)
      }
      for (const id of ownedIds) {
        dependencies.dismiss(id)
      }
      scopedToasts.clear()
      ownedIds.clear()
    }
  }
}
