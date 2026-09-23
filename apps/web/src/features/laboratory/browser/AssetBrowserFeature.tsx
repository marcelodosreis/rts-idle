import { useCallback, useEffect, useRef } from 'react'
import { SpriteLabContext } from '../shared/lab-context'
import { useAssetLibrary } from '../shared/use-asset-library'
import { BrowseView } from './BrowseView'

declare global {
  interface Window {
    __spriteLab?: {
      browse(key: string): void
      tab(): string
      ready: boolean
    }
  }
}

export function AssetBrowserFeature() {
  const { ctx } = useAssetLibrary('/assets')
  const browseRef = useRef<((key: string) => void) | null>(null)
  const pendingBrowse = useRef<string | null>(null)

  useEffect(() => {
    window.__spriteLab = {
      browse(key: string): void {
        const select = browseRef.current
        if (select !== null) {
          select(key)
        } else {
          pendingBrowse.current = key
        }
      },
      tab: () => 'browse',
      ready: browseRef.current !== null
    }
    return () => {
      delete window.__spriteLab
    }
  }, [])

  const setBrowseSelect = useCallback((select: (key: string) => void): void => {
    browseRef.current = select
    const queued = pendingBrowse.current
    if (queued !== null) {
      pendingBrowse.current = null
      select(queued)
    }
    if (window.__spriteLab !== undefined) {
      window.__spriteLab.ready = true
    }
  }, [])

  if (ctx === null) {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center text-sm text-muted-foreground">
        Loading assets…
      </div>
    )
  }

  return (
    <SpriteLabContext.Provider value={ctx}>
      <BrowseView onSelectReady={setBrowseSelect} />
    </SpriteLabContext.Provider>
  )
}
