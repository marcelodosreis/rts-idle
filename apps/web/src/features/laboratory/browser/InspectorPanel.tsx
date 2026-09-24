import { useCallback, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Slider } from '@/shared/ui/slider'
import { Switch } from '@/shared/ui/switch'
import { useLabContext } from '../shared/lab-context'
import type { BuildKind, RenderOptions } from './canvas.js'
import { validateEntry } from './validate-entry.js'

export interface InspectorPanelProps {
  readonly key: string
  readonly kind: BuildKind
  readonly slices: number
  readonly options: RenderOptions
  readonly summary: string
  readonly onPatchOptions: (patch: Partial<RenderOptions>) => void
  readonly onValidate: (text: string) => void
  readonly onPlay: () => void
}

function Toggle({
  label,
  checked,
  onChange
}: {
  readonly label: string
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: nested control (Switch)
    <label className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted/20">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false
}: {
  readonly title: string
  readonly icon: string
  readonly children: React.ReactNode
  readonly defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-border/30 last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/20"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{icon}</span>
        <span className="flex-1">{title}</span>
        <svg
          className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {isOpen && <div className="space-y-1 px-1 pb-2">{children}</div>}
    </div>
  )
}

export function InspectorPanel({
  key,
  kind,
  slices,
  options,
  summary,
  onPatchOptions,
  onValidate,
  onPlay
}: InspectorPanelProps) {
  const ctx = useLabContext()

  const handleValidate = useCallback((): void => {
    const entry = ctx.assets.entry(key)
    if (entry === null) {
      onValidate(`no entry for ${key}`)
      return
    }
    void validateEntry(ctx, key, entry).then(onValidate)
  }, [ctx, key, onValidate])

  return (
    <aside
      className="flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card"
      aria-label="Asset inspector"
    >
      {/* Readout */}
      <div className="border-b border-border/50 p-3">
        <pre
          className="min-h-10 whitespace-pre-wrap rounded-lg bg-muted/30 p-2.5 font-mono text-[11px] leading-relaxed"
          aria-live="polite"
        >
          {summary}
        </pre>
      </div>

      <ScrollArea className="flex-1">
        {/* Playback - always visible */}
        <div className="border-b border-border/50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm">🎬</span>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Playback</span>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/20 px-2.5 py-2">
            <Label className="text-sm">FPS</Label>
            <div className="flex w-32 items-center gap-2">
              <Slider
                min={1}
                max={30}
                step={1}
                value={[options.fps]}
                onValueChange={([v]) => onPatchOptions({ fps: v ?? options.fps })}
              />
              <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{options.fps}</span>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Toggle label="Paused" checked={options.paused} onChange={(c) => onPatchOptions({ paused: c })} />
          </div>
        </div>

        {/* Slices - only for multi-frame assets */}
        {slices >= 1 && (
          <div className="border-b border-border/50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm">🔲</span>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Slices</span>
            </div>
            <Toggle label="Show grid" checked={options.slices} onChange={(c) => onPatchOptions({ slices: c })} />
            {options.slices && (
              <Button variant="outline" size="sm" onClick={onPlay} className="mt-2 w-full">
                ▶ Back to animation
              </Button>
            )}
          </div>
        )}

        {/* Overlays - collapsible */}
        <CollapsibleSection title="Overlays" icon="👁️" defaultOpen={false}>
          <Toggle
            label="Transparency checker"
            checked={options.checker}
            onChange={(c) => onPatchOptions({ checker: c })}
          />
          <Toggle label="Anchor + grid" checked={options.overlay} onChange={(c) => onPatchOptions({ overlay: c })} />
          <Toggle label="Grid lines" checked={options.gridLines} onChange={(c) => onPatchOptions({ gridLines: c })} />
        </CollapsibleSection>

        {/* Type-specific - collapsible */}
        {kind === 'unit' && (
          <CollapsibleSection title="Unit options" icon="⚔️" defaultOpen={false}>
            <Toggle label="Flip" checked={options.flip} onChange={(c) => onPatchOptions({ flip: c })} />
            <Toggle label="Shadow" checked={options.shadow} onChange={(c) => onPatchOptions({ shadow: c })} />
          </CollapsibleSection>
        )}

        {kind === 'fx' && (
          <CollapsibleSection title="FX options" icon="✨" defaultOpen={false}>
            <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm">
              <Label>Blend mode</Label>
              <Select
                value={options.blend}
                onValueChange={(v) => onPatchOptions({ blend: v as RenderOptions['blend'] })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="add">Additive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CollapsibleSection>
        )}

        {kind === 'tileset' && (
          <CollapsibleSection title="Tileset options" icon="🗺️" defaultOpen={false}>
            <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm">
              <Label>Variant</Label>
              <Select value={String(options.variant)} onValueChange={(v) => onPatchOptions({ variant: Number(v) })}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: slices }, (_, i) => (
                    <SelectItem
                      // biome-ignore lint/suspicious/noArrayIndexKey: sequential variants 0..n-1
                      key={i}
                      value={String(i)}
                    >
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CollapsibleSection>
        )}

        {/* Validate */}
        <div className="p-3">
          <Button variant="secondary" size="sm" onClick={handleValidate} className="w-full">
            Validate asset
          </Button>
        </div>
      </ScrollArea>
    </aside>
  )
}
