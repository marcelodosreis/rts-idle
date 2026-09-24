import { AssetLibrary } from '@rts/renderer'
import { useEffect, useState } from 'react'
import type { SectionContext } from './core/types.js'

export interface LabSession {
  ctx: SectionContext | null
}

/** Loads the AssetLibrary once; `ctx` stays null until the manifest resolves. */
export function useAssetLibrary(baseUrl: string): LabSession {
  const [ctx, setCtx] = useState<SectionContext | null>(null)

  useEffect(() => {
    let cancelled = false
    const assets = new AssetLibrary(baseUrl)
    void assets.load().then((art) => {
      if (!cancelled) {
        setCtx({ assets, art })
      }
    })
    return () => {
      cancelled = true
      assets.destroy()
    }
  }, [baseUrl])

  return { ctx }
}
