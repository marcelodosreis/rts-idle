import { useCallback, useEffect, useState } from 'react'

export type SpritesTab = 'browse' | 'level' | 'stress' | 'report'

const TABS: readonly SpritesTab[] = ['browse', 'level', 'stress', 'report']

function tabFromHash(hash: string): SpritesTab {
  const id = hash.replace(/^#/, '')
  return (TABS as readonly string[]).includes(id) ? (id as SpritesTab) : 'browse'
}

export interface SpritesTabState {
  readonly tab: SpritesTab
  readonly setTab: (tab: SpritesTab) => void
  readonly readTab: () => SpritesTab
}

/** Persists the active tab in `location.hash` and stays in sync on back/forward. */
export function useSpritesTab(): SpritesTabState {
  const [tab, setTabState] = useState<SpritesTab>(() => tabFromHash(location.hash))

  useEffect(() => {
    const onHash = (): void => setTabState(tabFromHash(location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const setTab = useCallback((next: SpritesTab): void => {
    history.replaceState(null, '', `#${next}`)
    setTabState(next)
  }, [])

  const readTab = useCallback((): SpritesTab => tabFromHash(location.hash), [])

  return { tab, setTab, readTab }
}
