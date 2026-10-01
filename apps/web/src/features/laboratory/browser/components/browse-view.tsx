import { useCallback, useRef } from 'react'
import { useBrowse } from '../hooks/use-browse'
import { useBrowseController } from '../hooks/use-browse-controller'
import { useSpriteCanvas } from '../hooks/use-sprite-canvas'
import { BrowseBreadcrumb } from './browse-breadcrumb'
import { BrowseCanvasNav } from './browse-canvas-nav'
import { InspectorPanel } from './inspector-panel'
import { SidebarNav } from './sidebar-nav'

export interface BrowseViewProps {
  readonly onSelectReady: (select: (key: string) => void) => void
  readonly requestedBrowse: string | null
  readonly onBrowseHandled: () => void
}

/**
 * Browse tab: 3-column reactive layout (sidebar nav / central canvas /
 * inspector). React owns selection + options; the Pixi canvas is a controlled
 * view rendered whenever key/options change.
 */
export function BrowseView({ onSelectReady, requestedBrowse, onBrowseHandled }: BrowseViewProps) {
  const browse = useBrowse()
  const hostRef = useRef<HTMLDivElement | null>(null)
  const onSlice = useCallback((index: number): void => browse.patchOptions({ variant: index }), [browse])
  const { ref: canvasRef, ready: canvasReady } = useSpriteCanvas(hostRef, browse.ctx, browse.setSummary, onSlice)
  const controller = useBrowseController(browse, {
    onSelectReady,
    requestedBrowse,
    onBrowseHandled,
    canvasRef,
    canvasReady
  })

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[240px_1fr] lg:h-[calc(100vh-140px)] lg:grid-cols-[220px_1fr_260px] xl:grid-cols-[260px_1fr_300px]">
      <div className="order-2 h-[45vh] min-h-[320px] min-w-0 md:order-none md:h-[60vh] lg:h-auto lg:min-h-0">
        <SidebarNav
          catalog={browse.catalog}
          selection={browse.selection}
          filteredKeys={browse.filteredKeys}
          onPatch={browse.patchSelection}
          onSelectKey={controller.select}
        />
      </div>

      <div className="order-1 flex h-[55vh] min-h-[360px] min-w-0 flex-col gap-2 md:order-none md:h-[60vh] lg:h-auto lg:min-h-0">
        <BrowseBreadcrumb
          parts={controller.crumbParts}
          keys={controller.crumbKeys}
          hasSelection={controller.hasSelection}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/50 bg-background">
          <div ref={hostRef} className="min-h-0 min-w-0 flex-1" />
        </div>
        <BrowseCanvasNav
          position={controller.position}
          hasSelection={controller.hasSelection}
          onStep={controller.step}
        />
      </div>

      <div className="order-3 min-w-0 md:order-none md:col-span-2 lg:col-span-1">
        <InspectorPanel
          key={browse.selection.key}
          kind={controller.kind}
          slices={controller.slices}
          options={browse.options}
          summary={controller.summary}
          onPatchOptions={browse.patchOptions}
          onValidate={controller.setSummary}
          onPlay={() => browse.patchOptions({ slices: false, paused: false })}
        />
      </div>
    </div>
  )
}
