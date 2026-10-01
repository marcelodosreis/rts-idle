import { useMemo } from 'react'
import { cn } from '@/shared/lib/utils'
import { groupKeysByDepth } from '../lib/catalog'

/** Category metadata for visual styling. */
export const CATEGORY_STYLES: Record<string, { icon: string; color: string; bg: string }> = {
  buildings: { icon: '🏛️', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  decorations: { icon: '🌿', color: 'text-green-400', bg: 'bg-green-500/10' },
  fx: { icon: '✨', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  terrain: { icon: '⛰️', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  units: { icon: '⚔️', color: 'text-red-400', bg: 'bg-red-500/10' }
}

export const DEFAULT_CATEGORY_STYLE = { icon: '📦', color: 'text-gray-400', bg: 'bg-gray-500/10' }

export interface AssetGroup {
  readonly name: string
  readonly keys: readonly string[]
}

/** Groups assets by their second-level prefix for better visual organization. */
export function groupAssets(keys: readonly string[]): readonly AssetGroup[] {
  const groups = new Map<string, string[]>()
  for (const key of keys) {
    const parts = key.split('.')
    const group = parts[1] ?? ''
    const list = groups.get(group)
    if (list === undefined) {
      groups.set(group, [key])
    } else {
      list.push(key)
    }
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, groupKeys]) => ({ name, keys: groupKeys }))
}

interface AssetKeyButtonProps {
  readonly assetKey: string
  readonly isSelected: boolean
  readonly isFocused: boolean
  readonly onSelect: (key: string) => void
  readonly onFocus: (key: string | null) => void
}

function AssetKeyButton({ assetKey, isSelected, isFocused, onSelect, onFocus }: AssetKeyButtonProps) {
  const parts = assetKey.split('.')
  const shortName = parts[parts.length - 1] ?? assetKey
  const style = CATEGORY_STYLES[parts[0] ?? ''] ?? DEFAULT_CATEGORY_STYLE
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      className={cn(
        'flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition-all',
        isSelected
          ? `${style.bg} font-medium text-foreground`
          : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
        isFocused && 'ring-1 ring-ring'
      )}
      onClick={() => onSelect(assetKey)}
      onFocus={() => onFocus(assetKey)}
      onBlur={() => onFocus(null)}
    >
      <span className={cn('text-xs', style.color)}>{style.icon}</span>
      <span className="flex-1 truncate text-[12px]">{shortName}</span>
    </button>
  )
}

export interface AssetKeyTreeProps {
  readonly keys: readonly string[]
  readonly depth: number
  readonly selectedKey: string
  readonly focusedKey: string | null
  readonly onSelect: (key: string) => void
  readonly onFocus: (key: string | null) => void
}

/** Recursive depth-grouped asset key list with category icons. */
export function AssetKeyTree({ keys, depth, selectedKey, focusedKey, onSelect, onFocus }: AssetKeyTreeProps) {
  const groups = useMemo(() => groupKeysByDepth(keys, depth), [keys, depth])
  const groupedSet = useMemo(() => new Set(groups.flatMap((group) => group.keys)), [groups])
  const handlers = { onSelect, onFocus }

  if (groups.length === 0) {
    return (
      <>
        {keys.map((key) => (
          <AssetKeyButton
            key={key}
            assetKey={key}
            isSelected={selectedKey === key}
            isFocused={focusedKey === key}
            {...handlers}
          />
        ))}
      </>
    )
  }

  return (
    <>
      {groups.map((group) => (
        <div key={group.name} className="ml-2 mt-0.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5">
            <span className="text-[10px] font-medium text-muted-foreground/70">{group.name}</span>
            <span className="text-[9px] tabular-nums text-muted-foreground/40">{group.keys.length}</span>
          </div>
          <AssetKeyTree
            keys={group.keys}
            depth={depth + 1}
            selectedKey={selectedKey}
            focusedKey={focusedKey}
            onSelect={onSelect}
            onFocus={onFocus}
          />
        </div>
      ))}
      {keys
        .filter((key) => !groupedSet.has(key))
        .map((key) => (
          <AssetKeyButton
            key={key}
            assetKey={key}
            isSelected={selectedKey === key}
            isFocused={focusedKey === key}
            {...handlers}
          />
        ))}
    </>
  )
}
