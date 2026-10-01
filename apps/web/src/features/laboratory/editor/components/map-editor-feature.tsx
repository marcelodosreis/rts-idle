import { useAssetLibrary } from '../../shared/hooks/use-asset-library'
import { SpriteLabContext } from '../../shared/services/lab-context'
import { TerrainView } from './terrain-view'

export function MapEditorFeature() {
  const { ctx } = useAssetLibrary('/assets')

  if (ctx === null) {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center text-sm text-muted-foreground">
        Loading assets…
      </div>
    )
  }

  return (
    <SpriteLabContext.Provider value={ctx}>
      <TerrainView />
    </SpriteLabContext.Provider>
  )
}
