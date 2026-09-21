import type { HudConstruction, HudMineral } from './types'

export function constructionStatusLine(construction: HudConstruction): string {
  if (construction.status === 'COMPLETED') {
    return 'Ready'
  }
  const status = construction.builderId === null ? 'No worker assigned' : `Worker #${construction.builderId}`
  return `${construction.progressTicks}/${construction.totalTicks} · ${status}`
}

export function mineralRemainingLine(mineral: HudMineral): string {
  return `${mineral.remaining} remaining`
}
