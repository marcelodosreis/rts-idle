import { AssetLibrary } from '@rts/renderer'
import { createContext, useContext } from 'react'
import type { SectionContext } from '../types/section-context'

/** React context carrying the shared, read-only lab context (assets + art flag). */
export const SpriteLabContext = createContext<SectionContext | null>(null)

export function useLabContext(): SectionContext {
  const ctx = useContext(SpriteLabContext)
  if (ctx === null) {
    throw new Error('SpriteLabContext provider missing')
  }
  return ctx
}

export { AssetLibrary }
