import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { BuildKind } from './canvas.js'
import { InspectorPanel } from './InspectorPanel.js'
import { SidebarNav } from './SidebarNav.js'
import { useBrowse } from './use-browse.js'
import { useSpriteCanvas } from './use-sprite-canvas.js'

export interface BrowseViewProps {
  readonly onSelectReady: (select: (key: string) => void) => void
}

/**
 * Browse tab: 3-column reactive layout (sidebar nav / central canvas /
 * inspector). React owns selection + options; the Pixi canvas is a controlled
 * view rendered whenever key/options change.
 */
export function BrowseView({ onSelectReady }: BrowseViewProps) {
  const browse = useBrowse()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [kind, setKind] = useState<BuildKind>('static')
  const [slices, setSlices] = useState(0)
  const [summary, setSummary] = useState('select an asset')

  const onSummary = useCallback((text: string): void => setSummary(text), [])
  const onSlice = useCallback((index: number): void => browse.patchOptions({ variant: index }), [browse])
  const { ref: canvasRef, ready: canvasReady } = useSpriteCanvas(hostRef, browse.ctx, onSummary, onSlice)

  useEffect(() => {
    if (browse.selection.key === '' || !canvasReady || canvasRef.current === null) {
      return
    }
    void canvasRef.current.render(browse.selection.key, browse.options).then((result) => {
      setKind(result.kind)
      setSlices(result.slices)
      setSummary(result.summary)
    })
  }, [browse.selection.key, browse.options, canvasReady, canvasRef])

  const select = useCallback(
    (key: string): void => {
      if (key === '') {
        return
      }
      browse.patchSelection({ key })
    },
    [browse]
  )

  useEffect(() => {
    onSelectReady(select)
  }, [onSelectReady, select])

  const position = useMemo(() => {
    const index = browse.filteredKeys.indexOf(browse.selection.key)
    return browse.filteredKeys.length === 0 ? '0/0' : `${index + 1}/${browse.filteredKeys.length}`
  }, [browse.filteredKeys, browse.selection.key])

  const step = useCallback(
    (delta: number): void => {
      const keys = browse.filteredKeys
      if (keys.length === 0) {
        return
      }
      const index = keys.indexOf(browse.selection.key)
      const next = index === -1 ? 0 : (index + delta + keys.length) % keys.length
      select(keys[next] ?? '')
    },
    [browse.filteredKeys, browse.selection.key, select]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        step(e.key === 'ArrowLeft' ? -1 : 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step])

  const crumbParts = browse.selection.key.split('.')
  const crumbKeys = useMemo(() => {
    let prefix = ''
    return crumbParts.map((part) => {
      prefix = prefix === '' ? part : `${prefix}.${part}`
      return prefix
    })
  }, [crumbParts])

  const hasSelection = browse.selection.key !== ''

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 xl:h-[calc(100vh-140px)] xl:grid-cols-[260px_1fr_300px]">
      <div className="order-2 h-[40vh] min-h-0 xl:order-none xl:h-full">
        <SidebarNav
          catalog={browse.catalog}
          selection={browse.selection}
          filteredKeys={browse.filteredKeys}
          onPatch={browse.patchSelection}
          onSelectKey={select}
        />
      </div>

      {/* Center: canvas + breadcrumb + nav */}
      <div className="order-1 flex h-[50vh] min-h-0 flex-col gap-2 xl:order-none xl:h-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-3 py-2 text-xs">
          <svg
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          {crumbParts.length === 0 || !hasSelection ? (
            <span className="text-muted-foreground">Select an asset</span>
          ) : (
            crumbParts.map((part, i) => (
              <span key={crumbKeys[i] ?? part} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-muted-foreground/40">/</span>}
                <span
                  className={cn(
                    'truncate',
                    i === crumbParts.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {part}
                </span>
              </span>
            ))
          )}
        </div>

        {/* Canvas */}
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border/50 bg-background">
          <div ref={hostRef} className="min-h-0 flex-1" />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2">
          <Button variant="ghost" size="sm" onClick={() => step(-1)} disabled={!hasSelection} className="gap-1 text-xs">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Prev
          </Button>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{position}</span>
          <Button variant="ghost" size="sm" onClick={() => step(1)} disabled={!hasSelection} className="gap-1 text-xs">
            Next
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Inspector */}
      <div className="order-3 xl:order-none">
        <InspectorPanel
          key={browse.selection.key}
          kind={kind}
          slices={slices}
          options={browse.options}
          summary={summary}
          onPatchOptions={browse.patchOptions}
          onValidate={setSummary}
          onPlay={() => browse.patchOptions({ slices: false, paused: false })}
        />
      </div>
    </div>
  )
}
