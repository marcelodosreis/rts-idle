import { expect, test } from '@playwright/test'

// Spike C (§21.3), minimal scope: the renderer must present N units and
// produce a finite, measurable frame time. This is a measurement harness, not
// a hard FPS gate (headless SwiftShader is not representative of real GPU).

const COUNTS = [100, 1000, 5000]

test('renderer presents N units and reports frame time', async ({ page }) => {
  // The 5000-unit case renders a rich scene; CI's headless SwiftShader is slow,
  // so give the measurement harness a generous window (it is not a hard gate).
  test.setTimeout(180_000)
  await page.goto('/perf.html')

  for (const count of COUNTS) {
    const result = await page.evaluate((n) => window.__runRendererPerf!(n), count)
    expect(result.count).toBe(count)
    expect(result.frames).toBeGreaterThan(0)
    expect(Number.isFinite(result.avgMs)).toBe(true)
    expect(Number.isFinite(result.p95Ms)).toBe(true)
    expect(result.avgMs).toBeGreaterThan(0)
    console.log(
      `renderer perf count=${count} avg=${result.avgMs.toFixed(2)}ms p95=${result.p95Ms.toFixed(2)}ms max=${result.maxMs.toFixed(2)}ms`
    )
  }
})
