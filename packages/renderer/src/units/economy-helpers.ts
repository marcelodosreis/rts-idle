import type { RenderUnit } from '../core/types.js'
import { clampRatio } from '../effects/progress-bar.js'

export function economyBarRatio(economy: RenderUnit['economy']): number {
  if (economy === undefined) {
    return 0
  }
  if (economy.phase === 'gathering') {
    return clampRatio(economy.progressTicks, economy.progressMax)
  }
  return clampRatio(economy.cargoAmount, economy.cargoCapacity)
}

export function economyBarColor(economy: RenderUnit['economy']): number {
  return economy?.phase === 'gathering' ? 0xfbbf24 : 0x22c55e
}
