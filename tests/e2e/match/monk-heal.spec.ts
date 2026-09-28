import { expect, type Page, test } from '@playwright/test'
import { tilesToFixed } from '@rts/shared'

async function screenPoint(page: Page, x: number, y: number) {
  return page.evaluate(
    ([fixedX, fixedY]) => {
      const canvas = document.querySelector('canvas')
      if (canvas === null) {
        throw new Error('no canvas')
      }
      const rect = canvas.getBoundingClientRect()
      const point = window.__rtsDebug!.worldToScreen(fixedX, fixedY)
      return { x: rect.left + point.x, y: rect.top + point.y }
    },
    [x, y] as const
  )
}

test('Monk heals an allied unit through the match HUD', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/?scenario=monk-heal')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1)).toBeGreaterThan(0)

  const monkPoint = await screenPoint(page, tilesToFixed(8), tilesToFixed(11))
  const warriorPoint = await screenPoint(page, tilesToFixed(9), tilesToFixed(11))
  await page.mouse.click(monkPoint.x, monkPoint.y)
  await expect(page.getByRole('button', { name: /Monk #1/ })).toBeVisible()
  const healButton = page.getByRole('button', { name: /^Heal/ })
  await expect(healButton).toBeEnabled()

  await page.mouse.click(warriorPoint.x, warriorPoint.y)

  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getUnitHealth(2)?.current ?? 0), { timeout: 5_000 })
    .toBe(115)
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getSpriteState(1)?.anim ?? null)).toBe('attack')
  await expect(healButton).toBeDisabled()
  await expect(healButton).toHaveText(/Heal \(\d+s\)/)
})
