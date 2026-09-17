import type { RefObject } from 'react'

/** A selected unit projected for the HUD (id, archetype, movement state). */
export interface HudSelectionUnit {
  readonly id: number
  readonly kind: 'pawn' | 'warrior' | 'archer'
  readonly owner: number
  readonly moving: boolean
}

export interface MatchHudProps {
  readonly status: string
  readonly unitCount: number
  readonly selection: readonly HudSelectionUnit[]
  readonly resources: {
    readonly mineral: number
    readonly energy: number
    readonly supply: number
    readonly supplyCap: number
  } | null
  /** Renderer host mount point, owned by the match session. */
  readonly hostRef: RefObject<HTMLDivElement | null>
}

const KIND_LABEL: Readonly<Record<HudSelectionUnit['kind'], string>> = {
  pawn: 'Worker',
  warrior: 'Soldier',
  archer: 'Ranger'
}

/**
 * Minimal HUD that grows with each system (resources, selection, build/train
 * menus). Reads the player observation only — it never computes gameplay.
 * Menu buttons are disabled placeholders until the economy systems land.
 */
export function MatchHud({ status, unitCount, selection, resources, hostRef }: MatchHudProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '0.5rem 1rem',
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          background: 'rgba(0,0,0,0.55)',
          color: '#fff'
        }}
      >
        <span role="status">status: {status}</span>
        <span>units: {unitCount}</span>
        <span>selected: {selection.length}</span>
        <span>
          {resources === null
            ? 'resources: --'
            : `M ${resources.mineral} · E ${resources.energy} · supply ${resources.supply}/${resources.supplyCap}`}
        </span>
      </div>

      <div ref={hostRef} style={{ flex: 1, minHeight: 0 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          minHeight: '7rem',
          padding: '0.75rem',
          gap: '0.75rem',
          backgroundImage: "url('/assets/ui/panels/wood_table.png')",
          backgroundSize: '100% 100%',
          color: '#fff'
        }}
      >
        <div
          style={{
            flex: 1,
            backgroundImage: "url('/assets/ui/papers/regular.png')",
            backgroundSize: '100% 100%',
            color: '#2a2418',
            padding: '0.75rem 1rem',
            fontFamily: 'monospace',
            fontSize: '0.8rem'
          }}
          aria-live="polite"
        >
          {selection.length === 0 ? (
            <span>no selection</span>
          ) : (
            <>
              <div>{selection.length} selected</div>
              <div>{selection.map((unit) => `${KIND_LABEL[unit.kind]} #${unit.id}`).join(' · ')}</div>
              <div>{selection.map((unit) => `${unit.id}: ${unit.moving ? 'moving' : 'idle'}`).join(' · ')}</div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.4rem' }}>
          {['Build', 'Train', 'Research', 'Stop', 'Hold'].map((label) => (
            <button
              key={label}
              type="button"
              disabled={true}
              aria-label={`${label} (coming soon)`}
              style={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: '#fff',
                backgroundImage: "url('/assets/ui/buttons/big_blue.png')",
                backgroundSize: '100% 100%',
                border: 'none',
                padding: '0.5rem 1.25rem',
                cursor: 'not-allowed',
                opacity: 0.7
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
