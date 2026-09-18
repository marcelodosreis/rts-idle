import type { RefObject } from 'react'
import { CommandBar } from './CommandBar'
import { SelectionPanel } from './SelectionPanel'
import { TopBar } from './TopBar'
import type { HudResources, HudSelectionUnit } from './types'

export type { HudResources, HudSelectionUnit }

export interface MatchHudProps {
  readonly status: string
  readonly unitCount: number
  readonly tick: number
  readonly selection: readonly HudSelectionUnit[]
  readonly resources: HudResources | null
  /** Renderer host mount point, owned by the match session. */
  readonly hostRef: RefObject<HTMLDivElement | null>
}

/**
 * Match screen chrome: a glass top bar with resources/status, the battlefield
 * centered in a framed container, and a bottom dock with the selection context
 * card and the command palette. Reads the player observation only — it never
 * computes gameplay.
 */
export function MatchHud({ status, unitCount, tick, selection, resources, hostRef }: MatchHudProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TopBar
        status={status}
        unitCount={unitCount}
        selectedCount={selection.length}
        tick={tick}
        resources={resources}
      />
      <main className="grid min-h-0 flex-1 place-items-center p-4">
        <div
          ref={hostRef}
          className="aspect-square h-full max-w-full overflow-hidden rounded-xl border border-border/50 shadow-2xl"
        />
      </main>
      <footer className="flex h-44 shrink-0 items-stretch gap-3 border-t bg-card/70 p-3 backdrop-blur">
        <SelectionPanel selection={selection} />
        <CommandBar />
      </footer>
    </div>
  )
}
