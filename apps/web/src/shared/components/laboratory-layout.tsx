import { type ReactNode, Suspense } from 'react'
import { LaboratoryHeader } from './laboratory-header'
import { LaboratoryNavigation } from './laboratory-navigation'
import { RouteContentBoundary } from './route-content-boundary'

function LaboratoryContentLoading() {
  return (
    <div
      data-testid="route-content-loading"
      role="status"
      className="grid h-full min-h-0 place-content-center text-sm text-muted-foreground"
    >
      Loading laboratory content…
    </div>
  )
}

export function LaboratoryLayout({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div data-testid="laboratory-shell" className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
      <LaboratoryHeader title={title} />
      <LaboratoryNavigation />
      <main className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col overflow-hidden px-3 py-2 sm:px-4">
        <div className="flex min-h-0 flex-1 flex-col">
          <RouteContentBoundary>
            <Suspense fallback={<LaboratoryContentLoading />}>{children}</Suspense>
          </RouteContentBoundary>
        </div>
      </main>
    </div>
  )
}
