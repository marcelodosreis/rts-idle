import type { ReactNode } from 'react'
import { LaboratoryHeader } from './LaboratoryHeader'
import { LaboratoryNavigation } from './LaboratoryNavigation'

export function LaboratoryLayout({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <>
      <LaboratoryHeader title={title} />
      <LaboratoryNavigation />
      <main className="mx-auto max-w-[1400px] px-4 py-3">{children}</main>
    </>
  )
}
