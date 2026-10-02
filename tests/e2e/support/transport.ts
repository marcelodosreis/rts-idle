import type { Page } from '@playwright/test'

interface TransportMessageTrace {
  readonly type: 'snapshot' | 'snapshot_delta'
  readonly tick: number
  readonly viewSequence: number
  readonly viewHash: string
  readonly baseSequence?: number
  readonly unitCount: number
  readonly buildingCount: number
  readonly resourceCount: number
  readonly playerCount: number
  readonly resourcesComplete: boolean
  readonly dropped: boolean
}

interface TransportBaselineTrace {
  readonly tick: number
  readonly viewSequence: number
  readonly viewHash: string
}

export interface TransportDebugState {
  readonly connectionState: 'connecting' | 'open' | 'closed'
  readonly resumeToken: string | null
  readonly messages: readonly TransportMessageTrace[]
  readonly acceptedBaseline: TransportBaselineTrace | null
  readonly resyncRequests: number
  readonly droppedDeltas: number
}

interface TransportDebug {
  disconnect(): void
  reconnect(): void
  dropNextDelta(): void
  getState(): TransportDebugState
}

declare global {
  interface Window {
    __rtsTransportDebug?: TransportDebug
  }
}

export async function transportState(page: Page): Promise<TransportDebugState> {
  return page.evaluate(() => {
    const debug = window.__rtsTransportDebug
    if (debug === undefined) {
      throw new Error('transport debug hook is unavailable')
    }
    return debug.getState()
  })
}

export async function disconnectTransport(page: Page): Promise<void> {
  await page.evaluate(() => {
    const debug = window.__rtsTransportDebug
    if (debug === undefined) {
      throw new Error('transport debug hook is unavailable')
    }
    debug.disconnect()
  })
}

export async function reconnectTransport(page: Page): Promise<void> {
  await page.evaluate(() => {
    const debug = window.__rtsTransportDebug
    if (debug === undefined) {
      throw new Error('transport debug hook is unavailable')
    }
    debug.reconnect()
  })
}

export async function dropNextDelta(page: Page): Promise<void> {
  await page.evaluate(() => {
    const debug = window.__rtsTransportDebug
    if (debug === undefined) {
      throw new Error('transport debug hook is unavailable')
    }
    debug.dropNextDelta()
  })
}
