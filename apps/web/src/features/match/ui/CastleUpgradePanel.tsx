import type { BuildCatalogEntry } from '@rts/protocol'
import { Button } from '@/shared/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import type { HudConstruction, HudResources } from './types'

function upgradeReason(construction: HudConstruction, resources: HudResources, costMinerals: number): string | null {
  if ((construction.production?.queue.length ?? 0) > 0) {
    return 'Finish the Pawn queue before upgrading this Castle.'
  }
  if (resources.mineral < costMinerals) {
    return `Requires ${costMinerals} Minerals.`
  }
  return null
}

export function CastleUpgradePanel({
  construction,
  buildings,
  resources,
  onUpgrade
}: {
  readonly construction: HudConstruction
  readonly buildings: readonly BuildCatalogEntry[]
  readonly resources: HudResources | null
  readonly onUpgrade: (castleId: number) => void
}) {
  if (construction.buildingType !== 'CASTLE' || construction.status !== 'COMPLETED') {
    return null
  }
  if (construction.tierUpgrade !== undefined && construction.tierUpgrade !== null) {
    return null
  }
  if ((construction.tier ?? 1) >= 2) {
    return (
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild={true}>
            <span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-1.5 text-[11px]"
                disabled={true}
                data-testid="upgrade-castle"
              >
                Upgrade Castle III
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">Construction disabled.</TooltipContent>
        </Tooltip>
      </div>
    )
  }
  const costMinerals = buildings.find((building) => building.type === 'CASTLE')?.costMinerals ?? 0
  const currentResources = resources ?? {
    mineral: 0,
    supply: 0,
    supplyCap: 0,
    castleTier: 1,
    completedResearch: [],
    queuedResearch: []
  }
  const reason = upgradeReason(construction, currentResources, costMinerals)
  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-[11px]"
              disabled={reason !== null}
              onClick={() => onUpgrade(construction.id)}
              data-testid="upgrade-castle"
            >
              Upgrade Castle II · {costMinerals}
            </Button>
          </span>
        </TooltipTrigger>
        {reason !== null && <TooltipContent side="top">{reason}</TooltipContent>}
      </Tooltip>
    </div>
  )
}
