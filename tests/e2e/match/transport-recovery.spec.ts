import { expect, test } from '@playwright/test'
import { waitForMatchReady } from '../support/settle.js'
import { disconnectTransport, dropNextDelta, reconnectTransport, transportState } from '../support/transport.js'

function latestSnapshot(state: Awaited<ReturnType<typeof transportState>>) {
  return [...state.messages].reverse().find((message) => message.type === 'snapshot')
}

function latestDeltaAfter(state: Awaited<ReturnType<typeof transportState>>, viewSequence: number) {
  return [...state.messages]
    .reverse()
    .find((message) => message.type === 'snapshot_delta' && message.baseSequence === viewSequence)
}

function snapshotCount(state: Awaited<ReturnType<typeof transportState>>): number {
  return state.messages.filter((message) => message.type === 'snapshot').length
}

function snapshotCountSince(state: Awaited<ReturnType<typeof transportState>>, offset: number): number {
  return state.messages.slice(offset).filter((message) => message.type === 'snapshot').length
}

test('reconnect resumes gameplay with an authoritative full state and a following delta', async ({ page }) => {
  test.setTimeout(45_000)
  await page.goto('/?scenario=regression')
  await waitForMatchReady(page)

  const connected = await transportState(page)
  expect(connected.connectionState).toBe('open')
  expect(connected.resumeToken).not.toBeNull()
  const initialUnitCount = await page.evaluate(() => Object.keys(window.__rtsDebug?.getPositions() ?? {}).length)
  expect(initialUnitCount).toBeGreaterThan(0)

  const initialMessageCount = connected.messages.length
  const initialSnapshot = latestSnapshot(connected)
  expect(initialSnapshot).toMatchObject({ type: 'snapshot', unitCount: initialUnitCount, resourcesComplete: true })

  await disconnectTransport(page)
  await expect.poll(() => transportState(page).then((state) => state.connectionState)).toBe('closed')

  await reconnectTransport(page)
  await expect.poll(() => transportState(page).then((state) => state.connectionState)).toBe('open')
  await expect
    .poll(() => transportState(page).then((state) => snapshotCountSince(state, initialMessageCount)))
    .toBeGreaterThan(0)

  const resumed = await transportState(page)
  expect(resumed.resumeToken).toBe(connected.resumeToken)
  const resumedMessages = resumed.messages.slice(initialMessageCount)
  const resumedSnapshot = resumedMessages.find((message) => message.type === 'snapshot')
  expect(resumedSnapshot).toMatchObject({ type: 'snapshot', unitCount: initialUnitCount, resourcesComplete: true })
  if (resumedSnapshot === undefined || resumedSnapshot.type !== 'snapshot') {
    throw new Error('expected an authoritative resume snapshot')
  }

  await expect
    .poll(() => transportState(page).then((state) => latestDeltaAfter(state, resumedSnapshot.viewSequence) ?? null))
    .not.toBeNull()

  const converged = await transportState(page)
  const followingDelta = latestDeltaAfter(converged, resumedSnapshot.viewSequence)
  expect(followingDelta).toMatchObject({ type: 'snapshot_delta', dropped: false })
  expect(converged.acceptedBaseline?.viewSequence).toBeGreaterThanOrEqual(followingDelta?.viewSequence ?? 0)
  expect(converged.resyncRequests).toBe(0)
  expect(await page.evaluate(() => Object.keys(window.__rtsDebug?.getPositions() ?? {}).length)).toBe(initialUnitCount)
})

test('a skipped delta forces a full resync and the next delta converges', async ({ page }) => {
  test.setTimeout(45_000)
  await page.goto('/?scenario=regression')
  await waitForMatchReady(page)

  const before = await transportState(page)
  const fullSnapshotCount = snapshotCount(before)
  await dropNextDelta(page)

  await expect.poll(() => transportState(page).then((state) => state.droppedDeltas)).toBe(before.droppedDeltas + 1)
  await expect.poll(() => transportState(page).then((state) => state.resyncRequests)).toBe(before.resyncRequests + 1)
  await expect.poll(() => transportState(page).then(snapshotCount)).toBeGreaterThan(fullSnapshotCount)

  const resynced = await transportState(page)
  expect(resynced.messages.some((message) => message.type === 'snapshot_delta' && message.dropped)).toBe(true)
  const resyncSnapshot = latestSnapshot(resynced)
  const initialUnitCount = await page.evaluate(() => Object.keys(window.__rtsDebug?.getPositions() ?? {}).length)
  expect(resyncSnapshot).toMatchObject({ type: 'snapshot', unitCount: initialUnitCount, resourcesComplete: true })
  if (resyncSnapshot === undefined || resyncSnapshot.type !== 'snapshot') {
    throw new Error('expected a full resync snapshot')
  }

  await expect
    .poll(() => transportState(page).then((state) => latestDeltaAfter(state, resyncSnapshot.viewSequence) ?? null))
    .not.toBeNull()

  const converged = await transportState(page)
  const followingDelta = latestDeltaAfter(converged, resyncSnapshot.viewSequence)
  expect(followingDelta).toMatchObject({ type: 'snapshot_delta', dropped: false })
  expect(converged.resyncRequests).toBe(before.resyncRequests + 1)
  expect(converged.acceptedBaseline?.viewSequence).toBeGreaterThanOrEqual(followingDelta?.viewSequence ?? 0)
  expect(await page.evaluate(() => Object.keys(window.__rtsDebug?.getPositions() ?? {}).length)).toBe(initialUnitCount)
})
