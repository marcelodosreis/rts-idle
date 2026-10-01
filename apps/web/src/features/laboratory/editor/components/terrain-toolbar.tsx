import type { DressingKind } from '@rts/renderer'
import type { ChangeEvent, RefObject } from 'react'
import { Button } from '@/shared/ui/button'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { TERRAIN_BRUSHES } from '../types/terrain-brushes'
import type { EditorTab, TerrainController, TerrainState } from '../types/terrain-editor-data'
import { BrushButton } from './brush-button'
import { DecoKindGrid } from './deco-kind-grid'
import { HistoryButtons } from './history-buttons'
import { VariantPicker } from './variant-picker'

export interface TerrainToolbarProps {
  readonly state: TerrainState
  readonly controller: TerrainController | null
  readonly fileInputRef: RefObject<HTMLInputElement | null>
  readonly onPatch: (patch: Partial<TerrainState>) => void
  readonly onSelectDecoKind: (kind: DressingKind) => void
  readonly onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  readonly onExport: () => void
  readonly onImport: () => void
  readonly onDownload: () => void
  readonly onUploadClick: () => void
  readonly onPlaytest: () => void
  readonly onClearSaved: () => void
  readonly onReset: () => void
}

function TerrainTabContent({ state, onPatch }: Pick<TerrainToolbarProps, 'state' | 'onPatch'>) {
  return (
    <TabsContent value="terrain" className="mt-0 flex-1">
      <ScrollArea className="h-full">
        <div className="grid grid-cols-3 gap-1 pr-2">
          {TERRAIN_BRUSHES.map((brush) => (
            <BrushButton
              key={brush.value}
              brush={brush}
              active={state.paint === brush.value}
              onClick={() => onPatch({ paint: brush.value })}
            />
          ))}
        </div>
      </ScrollArea>
    </TabsContent>
  )
}

function DecorationsTabContent({
  state,
  onPatch,
  onSelectDecoKind
}: Pick<TerrainToolbarProps, 'state' | 'onPatch' | 'onSelectDecoKind'>) {
  return (
    <TabsContent value="decorations" className="mt-0 flex-1">
      <ScrollArea className="h-full">
        <div className="pr-2">
          <DecoKindGrid selected={state.selectedDecoKind} onSelect={onSelectDecoKind} />
          {state.selectedDecoKind !== null && (
            <VariantPicker
              kind={state.selectedDecoKind}
              selectedVariant={state.selectedVariant}
              onSelect={(variant) => onPatch({ selectedVariant: variant })}
            />
          )}
        </div>
      </ScrollArea>
    </TabsContent>
  )
}

function ToolbarFooter({
  controller,
  fileInputRef,
  onPatch,
  onFileChange,
  onExport,
  onImport,
  onDownload,
  onUploadClick,
  onPlaytest,
  onClearSaved,
  onReset
}: Omit<TerrainToolbarProps, 'state' | 'onSelectDecoKind'>) {
  return (
    <div className="flex flex-col gap-2 px-1">
      <div className="flex items-center justify-between">
        <HistoryButtons controller={controller} onStateChange={onPatch} />
      </div>
      <div className="h-px bg-border/50" />
      <div className="grid grid-cols-2 gap-1.5">
        <Button variant="outline" size="sm" onClick={onExport} className="h-8 text-[10px]">
          Export
        </Button>
        <Button variant="outline" size="sm" onClick={onImport} className="h-8 text-[10px]">
          Import
        </Button>
        <Button variant="outline" size="sm" onClick={onDownload} className="h-8 text-[10px]">
          Download
        </Button>
        <Button variant="outline" size="sm" onClick={onUploadClick} className="h-8 text-[10px]">
          Upload
        </Button>
        <Button variant="default" size="sm" onClick={onPlaytest} className="h-8 text-[10px]">
          Playtest
        </Button>
        <Button variant="ghost" size="sm" onClick={onClearSaved} className="h-8 text-[10px]">
          Clear saved
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          aria-label="upload map json"
          className="hidden"
          onChange={onFileChange}
        />
        <Button variant="outline" size="sm" onClick={() => controller?.resetCamera()} className="h-8 text-[10px]">
          Fit
        </Button>
        <Button variant="destructive" size="sm" onClick={onReset} className="h-8 text-[10px]">
          Reset
        </Button>
      </div>
    </div>
  )
}

export function TerrainToolbar(props: TerrainToolbarProps) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-2 rounded-xl border border-border/50 bg-card p-2 md:w-[200px]">
      <Tabs
        value={props.state.editorTab}
        onValueChange={(value) => props.onPatch({ editorTab: value as EditorTab })}
        className="flex flex-1 flex-col gap-2"
      >
        <TabsList className="w-full">
          <Tooltip>
            <TooltipTrigger asChild={true}>
              <TabsTrigger value="terrain" className="flex-1 text-[11px]">
                Terrain
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              Terrain <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">T</kbd>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild={true}>
              <TabsTrigger value="decorations" className="flex-1 text-[11px]">
                Decor
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>
              Decorations <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">D</kbd>
            </TooltipContent>
          </Tooltip>
        </TabsList>
        <TerrainTabContent state={props.state} onPatch={props.onPatch} />
        <DecorationsTabContent state={props.state} onPatch={props.onPatch} onSelectDecoKind={props.onSelectDecoKind} />
      </Tabs>
      <div className="h-px bg-border/50" />
      <ToolbarFooter {...props} />
    </div>
  )
}
