import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getFilterMode, setFilterMode } from './lab/app.js'
import { SpriteLabContext } from './lab-context'
import { useAssetLibrary } from './use-asset-library'
import { type SpritesTab, useSpritesTab } from './use-sprites-tab'

const BrowseView = lazy(() => import('./browse/BrowseView').then((m) => ({ default: m.BrowseView })))
const TerrainView = lazy(() => import('./tabs/TerrainView').then((m) => ({ default: m.TerrainView })))
const StressView = lazy(() => import('./tabs/StressView').then((m) => ({ default: m.StressView })))
const ReportView = lazy(() => import('./tabs/ReportView').then((m) => ({ default: m.ReportView })))

declare global {
  interface Window {
    __spriteLab?: {
      filterMode(): string
      browse(key: string): void
      tab(): string
    }
  }
}

const TABS: readonly { readonly id: SpritesTab; readonly label: string }[] = [
  { id: 'browse', label: 'Browse' },
  { id: 'level', label: 'Level Editor' },
  { id: 'stress', label: 'Stress' },
  { id: 'report', label: 'Report' }
]

function Header({
  filterChecked,
  onFilterToggle
}: {
  readonly filterChecked: boolean
  readonly onFilterToggle: (checked: boolean) => void
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-6 py-2.5">
        <h1 className="text-sm font-semibold tracking-tight">Sprite Lab</h1>
        <span className="text-xs text-muted-foreground/60">Tiny Swords asset validation</span>
        <div className="ml-auto flex items-center gap-3">
          {/* biome-ignore lint/a11y/noLabelWithoutControl: o controle (Switch) está aninhado */}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Filter
            <Switch checked={filterChecked} onCheckedChange={onFilterToggle} aria-label="texture filter" />
            <span className="w-12 font-mono text-[11px]">{getFilterMode()}</span>
          </label>
          <Button variant="outline" size="sm" asChild className="h-7 text-xs">
            <a href="/">Back to game</a>
          </Button>
        </div>
      </div>
    </header>
  )
}

export function SpritesApp() {
  const { tab, setTab, readTab } = useSpritesTab()
  const { ctx } = useAssetLibrary('/assets')
  const [filterChecked, setFilterChecked] = useState(true)
  const browseRef = useRef<((key: string) => void) | null>(null)
  const pendingBrowse = useRef<string | null>(null)

  const onFilterToggle = useCallback((checked: boolean): void => {
    setFilterChecked(checked)
    setFilterMode(checked ? 'nearest' : 'linear')
  }, [])

  useEffect(() => {
    window.__spriteLab = {
      filterMode: getFilterMode,
      browse(key: string): void {
        setTab('browse')
        const select = browseRef.current
        if (select !== null) {
          select(key)
        } else {
          pendingBrowse.current = key
        }
      },
      tab: readTab
    }
  }, [setTab, readTab])

  const setBrowseSelect = useCallback((select: (key: string) => void): void => {
    browseRef.current = select
    const queued = pendingBrowse.current
    if (queued !== null) {
      pendingBrowse.current = null
      select(queued)
    }
  }, [])

  if (ctx === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading assets…</div>
    )
  }

  return (
    <SpriteLabContext.Provider value={ctx}>
      <Header filterChecked={filterChecked} onFilterToggle={onFilterToggle} />
      <main className="mx-auto max-w-[1400px] px-4 py-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as SpritesTab)}>
          <TabsList className="mb-3">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="browse">
            <Suspense fallback={<p className="text-sm text-muted-foreground">loading…</p>}>
              <BrowseView onSelectReady={setBrowseSelect} />
            </Suspense>
          </TabsContent>
          <TabsContent value="level">
            <Suspense fallback={<p className="text-sm text-muted-foreground">loading…</p>}>
              <TerrainView />
            </Suspense>
          </TabsContent>
          <TabsContent value="stress">
            <Suspense fallback={<p className="text-sm text-muted-foreground">loading…</p>}>
              <StressView />
            </Suspense>
          </TabsContent>
          <TabsContent value="report">
            <Suspense fallback={<p className="text-sm text-muted-foreground">loading…</p>}>
              <ReportView />
            </Suspense>
          </TabsContent>
        </Tabs>
      </main>
    </SpriteLabContext.Provider>
  )
}
