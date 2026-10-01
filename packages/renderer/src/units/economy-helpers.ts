import { economyProgressTone } from '@rts/shared'
import type { RenderUnit } from '../core/types.js'
import { clampRatio } from '../effects/progress-bar.js'
import { progressFillColor } from '../effects/progress-palette.js'

export function economyBarRatio(economy: RenderUnit['economy']): number {
  if (economy === undefined) {
    return 0
  }
  if (economy.phase === 'harvesting') {
    return clampRatio(economy.progressTicks, economy.progressMax)
  }
  return clampRatio(economy.cargoAmount, economy.cargoCapacity)
}

export function economyBarColor(economy: RenderUnit['economy']): number {
  return progressFillColor(economyProgressTone(economy?.phase ?? 'to_base'))
}
