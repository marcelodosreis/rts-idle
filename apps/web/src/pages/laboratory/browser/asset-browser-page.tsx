import { AssetBrowserFeature } from '@/features/laboratory/browser'
import { LaboratoryLayout } from '@/shared/components/laboratory-layout'

export function AssetBrowserPage() {
  return (
    <LaboratoryLayout title="Asset Browser">
      <AssetBrowserFeature />
    </LaboratoryLayout>
  )
}
