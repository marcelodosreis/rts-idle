import { type ReactNode, Suspense } from 'react'
import { LaboratoryHeader } from './LaboratoryHeader'
import { LaboratoryNavigation } from './LaboratoryNavigation'
import { RouteContentBoundary } from './RouteContentBoundary'

function LaboratoryContentLoading() {
  return (
    <div
      data-testid="route-content-loading"
      role="status"
      className="grid min-h-[calc(100vh-8rem)] place-content-center text-sm text-muted-foreground"
    >
      Loading laboratory content…
    </div>
  )
}

export function LaboratoryLayout({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <>
      <LaboratoryHeader title={title} />
      <LaboratoryNavigation />
      <main className="mx-auto max-w-[1400px] px-4 py-3">
        <RouteContentBoundary>
          <Suspense fallback={<LaboratoryContentLoading />}>{children}</Suspense>
        </RouteContentBoundary>
      </main>
    </>
  )
}
