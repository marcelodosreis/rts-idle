import { CircleCheck, Info, OctagonAlert, XCircle } from 'lucide-react'
import { toast as sonnerToast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { createToastScope, type ToastOptions, type ToastScope } from './toast-scope'

export type { ToastOptions, ToastScope } from './toast-scope'

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

function createSonnerToast(options: ToastOptions): string | number {
  const duration = options.priority === 'high' ? 4500 : 3250
  return sonnerToast.custom((toastId) => <ToastCard id={toastId} options={options} />, { duration })
}

export function createMatchToastScope(): ToastScope {
  return {
    ...createToastScope({
      create: createSonnerToast,
      dismiss: sonnerToast.dismiss,
      setTimeout: (callback, duration) => window.setTimeout(callback, duration),
      clearTimeout: (timer) => window.clearTimeout(timer)
    })
  }
}
