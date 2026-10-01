import { expect, type Page, test } from '@playwright/test'
import { tilesToFixed } from '@rts/shared'

async function canvasRect(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (canvas === null) {
      throw new Error('no canvas')
    }
    const rect = canvas.getBoundingClientRect()
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  })
}

async function fixedToPage(page: Page, x: number, y: number) {
  const rect = await canvasRect(page)
  const screen = await page.evaluate(([worldX, worldY]) => window.__rtsDebug!.worldToScreen(worldX, worldY), [
    x,
    y
  ] as const)
  return { x: rect.left + screen.x, y: rect.top + screen.y }
}

async function focusFixed(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(([fixedX, fixedY]) => window.__rtsDebug?.moveCamera(fixedX, fixedY), [x, y] as const)
}

async function dragBox(
  page: Page,
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number }
): Promise<void> {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 5 })
  await page.mouse.up()
}

async function ready(page: Page): Promise<void> {
  await page.goto('/?scenario=default&aggression=passive')
  await expect
    .poll(() => page.evaluate(() => window.__rtsDebug?.getTick() ?? -1), { timeout: 15_000 })
    .toBeGreaterThan(0)
}

test('box-selecting a construction shows it in the current context', async ({ page }) => {
  await ready(page)
  await focusFixed(page, tilesToFixed(8), tilesToFixed(8))
  const from = await fixedToPage(page, tilesToFixed(5), tilesToFixed(5))
  const to = await fixedToPage(page, tilesToFixed(12), tilesToFixed(10))
  await dragBox(page, from, to)

  await expect(page.getByTestId('construction-panel')).toContainText('Castle')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getSelection() ?? [])).toEqual([])
})

test('selecting an enemy construction shows its commands as locked', async ({ page }) => {
  await ready(page)
  await focusFixed(page, tilesToFixed(24), tilesToFixed(24))
  const from = await fixedToPage(page, tilesToFixed(22), tilesToFixed(22))
  const to = await fixedToPage(page, tilesToFixed(26), tilesToFixed(26))
  await dragBox(page, from, to)

  await expect(page.getByTestId('construction-panel')).toContainText('Castle')
  for (const command of ['train', 'upgrade', 'rally']) {
    await expect(page.getByTestId(command)).toHaveAttribute('aria-disabled', 'true')
  }
  await page.getByTestId('train').hover()
  await expect(page.getByText('Enemy constructions cannot receive your commands.', { exact: true })).toBeVisible()
})

test('box-selecting a tree shows it in the current context', async ({ page }) => {
  await ready(page)
  await focusFixed(page, tilesToFixed(5), tilesToFixed(23))
  const from = await fixedToPage(page, tilesToFixed(4), tilesToFixed(22))
  const to = await fixedToPage(page, tilesToFixed(6), tilesToFixed(24))
  await dragBox(page, from, to)

  await expect(page.getByTestId('resource-panel')).toContainText('Tree')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getSelection() ?? [])).toEqual([])
})

test('box-selecting the gold mine shows it in the current context', async ({ page }) => {
  await ready(page)
  await focusFixed(page, tilesToFixed(24), tilesToFixed(8.5))
  const from = await fixedToPage(page, tilesToFixed(23), tilesToFixed(8))
  const to = await fixedToPage(page, tilesToFixed(25), tilesToFixed(9))
  await dragBox(page, from, to)

  await expect(page.getByTestId('resource-panel')).toContainText('Gold Mine')
  await expect.poll(() => page.evaluate(() => window.__rtsDebug?.getSelection() ?? [])).toEqual([])
})
