import type { ResearchCatalogEntry } from '@rts/protocol'
import { MAX_PRODUCTION_QUEUE, type ResearchType } from '@rts/shared'
import { Button } from '@/shared/ui/button'
import { LockedButton } from './LockedButton'
import type { HudConstruction, HudResources } from './types'

const RESEARCH_LABELS: Readonly<Record<ResearchType, string>> = {
  ATTACK: 'Attack',
  DEFENSE: 'Defense',
  ECONOMY: 'Economy',
  MOVEMENT: 'Movement'
}

function blockedReason(entry: ResearchCatalogEntry, resources: HudResources, queueLength: number): string | null {
  if (resources.completedResearch.includes(entry.researchType)) {
    return 'Already completed.'
  }
  if (resources.queuedResearch.includes(entry.researchType)) {
    return 'Already queued in another Monastery.'
  }
  if (resources.castleTier < 2) {
    return 'Requires Castle II.'
  }
  if (queueLength >= MAX_PRODUCTION_QUEUE) {
    return 'Monastery queue is full.'
  }
  if (resources.mineral < entry.costMinerals) {
    return `Requires ${entry.costMinerals} Minerals.`
  }
  return null
}

export function ResearchButtons({
  construction,
  catalog,
  resources,
  onResearch
}: {
  readonly construction: HudConstruction
  readonly catalog: readonly ResearchCatalogEntry[]
  readonly resources: HudResources | null
  readonly onResearch: (monasteryId: number, researchType: ResearchType) => void
}) {
  if (construction.buildingType !== 'MONASTERY' || construction.status !== 'COMPLETED') {
    return null
  }
  const currentResources = resources ?? {
    mineral: 0,
    supply: 0,
    supplyCap: 0,
    castleTier: 1,
    completedResearch: [],
    queuedResearch: []
  }
  const queueLength = construction.production?.queue.length ?? 0
  return (
    <>
      {catalog.map((entry) => {
        const reason = blockedReason(entry, currentResources, queueLength)
        const label = `${RESEARCH_LABELS[entry.researchType]} · ${entry.costMinerals}`
        if (reason !== null) {
          return (
            <LockedButton
              key={entry.researchType}
              label={label}
              reason={reason}
              className="h-6 w-auto min-w-0 shrink-0 px-1 text-[10px]"
              testId={`research-${entry.researchType.toLowerCase()}`}
              fullWidth={false}
            />
          )
        }
        return (
          <Button
            key={entry.researchType}
            type="button"
            variant="outline"
            size="sm"
            className="h-6 min-w-0 shrink-0 px-1 text-[10px]"
            onClick={() => onResearch(construction.id, entry.researchType)}
            data-testid={`research-${entry.researchType.toLowerCase()}`}
            title={`${entry.costMinerals} minerals · ${entry.researchTicks} ticks`}
          >
            <span className="truncate">{label}</span>
          </Button>
        )
      })}
    </>
  )
}
