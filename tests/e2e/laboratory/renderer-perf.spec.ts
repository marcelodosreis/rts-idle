import { expect, test } from '@playwright/test'

// Spike C (§21.3), minimal scope: the renderer must present N units and
// produce a finite, measurable frame time. This is a measurement harness, not
// a hard FPS gate (headless SwiftShader is not representative of real GPU).

const COUNTS = [100, 1000, 5000]

test('renderer presents N units and reports frame time @perf', async ({ page }) => {
  // The 5000-unit case renders a rich scene; CI's headless SwiftShader is slow,
  // so give the measurement harness a generous window (it is not a hard gate).
  test.setTimeout(300_000)
  await page.goto('/laboratory/diagnostics')
  await page.waitForFunction(() => typeof window.__runRendererPerf === 'function')

  for (const count of COUNTS) {
    // Fewer sampled frames at higher counts keeps this bounded on slow
    // software-rendered CI runners without losing the smoke-test signal.
    const frames = count >= 5000 ? 30 : 120
    const result = await page.evaluate((args) => window.__runRendererPerf!(args.n, args.frames), {
      n: count,
      frames
    })
    expect(result.count).toBe(count)
    expect(result.frames).toBeGreaterThan(0)
    expect(Number.isFinite(result.avgMs)).toBe(true)
    expect(Number.isFinite(result.p95Ms)).toBe(true)
    expect(result.avgMs).toBeGreaterThan(0)
    expect(result.layout.centerX).toBeGreaterThan(0)
    expect(result.layout.centerY).toBeGreaterThan(0)
    expect(result.layout.zoom).toBeGreaterThanOrEqual(0.05)
    console.log(
      `renderer perf count=${count} avg=${result.avgMs.toFixed(2)}ms p95=${result.p95Ms.toFixed(2)}ms max=${result.maxMs.toFixed(2)}ms`
    )
  }
})

test('performance page runs a benchmark and displays metrics', async ({ page }) => {
  await page.goto('/laboratory/diagnostics')
  await page.waitForFunction(() => typeof window.__runRendererPerf === 'function')

  await page.getByLabel('Units').fill('100')
  await page.getByLabel('Frames').fill('3')
  const host = page.getByTestId('performance-canvas-host')
  const hostBox = await host.boundingBox()
  expect(hostBox).not.toBeNull()
  await page.getByRole('button', { name: 'Run Performance Test' }).click()

  const result = page.getByTestId('performance-result')
  await expect(result).toContainText('100')
  await expect(result).toContainText('Average')
  await expect(result).toContainText('P95')
  await expect(result).toContainText('Maximum')
  await expect(result).toContainText('3 frames measured')
  const canvas = host.locator('canvas')
  await expect(canvas).toBeVisible()
  const renderedHostBox = await host.boundingBox()
  const canvasBox = await canvas.boundingBox()
  expect(renderedHostBox).not.toBeNull()
  expect(canvasBox).not.toBeNull()
  expect(canvasBox!.x).toBeGreaterThanOrEqual(renderedHostBox!.x)
  expect(canvasBox!.y).toBeGreaterThanOrEqual(renderedHostBox!.y)
  expect(canvasBox!.width).toBeLessThanOrEqual(renderedHostBox!.width)
  expect(canvasBox!.height).toBeLessThanOrEqual(renderedHostBox!.height)
})
