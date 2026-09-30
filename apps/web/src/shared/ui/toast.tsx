import { CircleCheck, Info, OctagonAlert, XCircle } from 'lucide-react'
import { toast as sonnerToast } from 'sonner'
import { Button } from '@/shared/ui/button'

type ToastType = 'default' | 'success' | 'info' | 'warning' | 'error'

interface ToastActionProps {
  readonly children: string
  readonly onClick: () => void
}

interface ToastOptions {
  readonly title?: string
  readonly description?: string
  readonly type?: ToastType
  readonly priority?: 'normal' | 'high'
  readonly actionProps?: ToastActionProps
  readonly dedupeKey?: string
}

const toastIdsByKey = new Map<string, string | number>()

const TOAST_ICONS = {
  default: Info,
  success: CircleCheck,
  info: Info,
  warning: OctagonAlert,
  error: XCircle
} as const

function ToastCard({ id, options }: { readonly id: string | number; readonly options: ToastOptions }) {
  const type = options.type ?? 'default'
  const Icon = TOAST_ICONS[type]
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className="flex w-[min(360px,calc(100vw-24px))] items-start gap-3 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 shadow-lg"
    >
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${type === 'error' ? 'text-red-500' : 'text-zinc-300'}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 space-y-1">
        {options.title !== undefined && <p className="text-sm font-medium">{options.title}</p>}
        {options.description !== undefined && <p className="text-xs text-zinc-300">{options.description}</p>}
      </div>
      {options.actionProps !== undefined && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 shrink-0 border-zinc-500 bg-transparent px-2 text-xs text-zinc-100 hover:bg-zinc-700"
          onClick={() => {
            options.actionProps?.onClick()
            sonnerToast.dismiss(id)
          }}
        >
          {options.actionProps.children}
        </Button>
      )}
    </div>
  )
}

export const toast = {
  add(options: ToastOptions): string | number {
    const existing = options.dedupeKey === undefined ? undefined : toastIdsByKey.get(options.dedupeKey)
    if (existing !== undefined) {
      return existing
    }
    const duration = options.priority === 'high' ? 4500 : 3250
    const id = sonnerToast.custom((toastId) => <ToastCard id={toastId} options={options} />, {
      duration
    })
    if (options.dedupeKey !== undefined) {
      toastIdsByKey.set(options.dedupeKey, id)
      window.setTimeout(() => toastIdsByKey.delete(options.dedupeKey!), duration)
    }
    return id
  },
  close(id: string | number): void {
    sonnerToast.dismiss(id)
    for (const [key, value] of toastIdsByKey) {
      if (value === id) {
        toastIdsByKey.delete(key)
      }
    }
  }
}
