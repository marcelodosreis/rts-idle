import type { DressingKind } from '@rts/renderer'
import { DECO_ICONS } from '../types/terrain-brushes'
import { DRESSING_KIND_OPTIONS } from '../types/terrain-editor-data'

interface DecoKindGridProps {
  readonly selected: DressingKind | null
  readonly onSelect: (kind: DressingKind) => void
}

export function DecoKindGrid({ selected, onSelect }: DecoKindGridProps) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {DRESSING_KIND_OPTIONS.map((deco) => (
        <button
          key={deco.kind}
          type="button"
          className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] transition-all ${selected === deco.kind ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
          onClick={() => onSelect(deco.kind)}
        >
          <span className="text-sm">{DECO_ICONS[deco.kind]}</span>
          <span className="leading-tight">{deco.label}</span>
        </button>
      ))}
    </div>
  )
}
