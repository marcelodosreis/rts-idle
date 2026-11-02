import { expect, test } from '@playwright/test'
import { waitForMatchReady } from '../support/settle.js'

interface CameraState {
  readonly width: number
  readonly height: number
  readonly zoom: number
  readonly mapWidth: number
  readonly mapHeight: number
  readonly topLeft: { readonly x: number; readonly y: number }
  readonly bottomRight: { readonly x: number; readonly y: number }
}

async function cameraState(page: import('@playwright/test').Page): Promise<CameraState> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (canvas === null) {
      throw new Error('no canvas')
    }
    const rect = canvas.getBoundingClientRect()
    const map = window.__rtsDebug!.getMapInfo()
    return {
      width: rect.width,
      height: rect.height,
      zoom: window.__rtsDebug!.getZoom(),
      mapWidth: map.width * 64,
      mapHeight: map.height * 64,
      topLeft: window.__rtsDebug!.worldToScreen(0, 0),
      bottomRight: window.__rtsDebug!.worldToScreen(map.width * 256, map.height * 256)
    }
  })
}

test('camera cannot zoom out past the map or pan beyond its fog', async ({ page }) => {
  await page.goto('/?scenario=regression&aggression=passive')
  await waitForMatchReady(page)
  const box = await page.locator('canvas').boundingBox()
  expect(box).not.toBeNull()
  const center = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }
  await page.mouse.move(center.x, center.y)

  for (let step = 0; step < 20; step += 1) {
    await page.mouse.wheel(0, 800)
  }
  const zoomedOut = await cameraState(page)
  const cover = Math.max(zoomedOut.width / zoomedOut.mapWidth, zoomedOut.height / zoomedOut.mapHeight)
  expect(zoomedOut.zoom).toBeGreaterThanOrEqual(cover * 0.98)
  expect(zoomedOut.topLeft.x).toBeLessThanOrEqual(1)
  expect(zoomedOut.topLeft.y).toBeLessThanOrEqual(1)
  expect(zoomedOut.bottomRight.x).toBeGreaterThanOrEqual(zoomedOut.width - 1)
  expect(zoomedOut.bottomRight.y).toBeGreaterThanOrEqual(zoomedOut.height - 1)

  await page.mouse.wheel(0, -1600)
  for (let step = 0; step < 6; step += 1) {
    await page.mouse.move(center.x, center.y)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(center.x + 1800, center.y + 1800)
    await page.mouse.up({ button: 'middle' })
  }
  const panned = await cameraState(page)
  expect(panned.topLeft.x).toBeLessThanOrEqual(1)
  expect(panned.topLeft.y).toBeLessThanOrEqual(1)
  expect(panned.bottomRight.x).toBeGreaterThanOrEqual(panned.width - 1)
  expect(panned.bottomRight.y).toBeGreaterThanOrEqual(panned.height - 1)
})
