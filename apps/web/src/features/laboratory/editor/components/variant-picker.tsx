import type { DressingKind } from '@rts/renderer'
import { DRESSING_KIND_OPTIONS } from '../types/terrain-editor-data'

interface VariantPickerProps {
  readonly kind: DressingKind
  readonly selectedVariant: number
  readonly onSelect: (variant: number) => void
}

export function VariantPicker({ kind, selectedVariant, onSelect }: VariantPickerProps) {
  const deco = DRESSING_KIND_OPTIONS.find((candidate) => candidate.kind === kind)
  if (deco === undefined) {
    return null
  }
  return (
    <div className="mt-2">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {deco.label} variants
      </div>
      <div className="grid grid-cols-4 gap-1">
        {deco.keys.map((key, index) => (
          <button
            key={key}
            type="button"
            className={`flex h-8 items-center justify-center rounded-md text-[10px] font-medium transition-all ${selectedVariant === index ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
            onClick={() => onSelect(index)}
          >
            v{index}
          </button>
        ))}
      </div>
    </div>
  )
}
