import { AssetBrowserFeature } from '../../../features/laboratory/browser'
import { LaboratoryLayout } from '../../../shared/components/LaboratoryLayout'

export default function AssetBrowserPage() {
  return (
    <LaboratoryLayout title="Asset Browser">
      <AssetBrowserFeature />
    </LaboratoryLayout>
  )
}
