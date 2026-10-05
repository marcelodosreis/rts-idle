export interface TransportMessageTrace {
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

export interface TransportBaselineTrace {
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

export interface TransportDebug {
  disconnect(): void
  reconnect(): void
  dropNextDelta(): void
  getState(): TransportDebugState
}
