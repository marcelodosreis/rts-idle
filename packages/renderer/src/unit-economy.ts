import type { Graphics } from 'pixi.js'
import { economyBarColor, economyBarRatio } from './economy-helpers.js'
import { BAR_BACKGROUND, BAR_BORDER, BAR_HEIGHT, BAR_RADIUS, BAR_WIDTH, drawProgressBar } from './progress-bar.js'
import type { RenderUnit } from './types.js'

export { type EconomyFrames, economyAnimation, economyFrameKey, FACTION_BY_OWNER } from './economy-animation.js'
export { economyBarColor, economyBarRatio } from './economy-helpers.js'

export function drawEconomyBar(graphics: Graphics, economy: RenderUnit['economy']): void {
  if (economy === undefined) {
    graphics.visible = false
    return
  }
  graphics.visible = true
  graphics.clear()
  drawProgressBar(graphics, {
    x: -BAR_WIDTH / 2,
    y: -48,
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    ratio: economyBarRatio(economy),
    fillColor: economyBarColor(economy),
    background: BAR_BACKGROUND,
    border: BAR_BORDER,
    radius: BAR_RADIUS
  })
}
