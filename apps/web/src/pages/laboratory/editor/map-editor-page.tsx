import { MapEditorFeature } from '../../../features/laboratory/editor'
import { LaboratoryLayout } from '../../../shared/components/laboratory-layout'

export function MapEditorPage() {
  return (
    <LaboratoryLayout title="Map Editor">
      <MapEditorFeature />
    </LaboratoryLayout>
  )
}
