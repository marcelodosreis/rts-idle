import type { ErrorMessage, SnapshotMessage } from '@rts/protocol'
import type { SimulationEvent } from '@rts/shared'
import type { WebSocket } from 'ws'
import type { GameSession } from '../sessions/session.js'

export class SnapshotSender {
  constructor(private readonly ws: WebSocket) {}

  sendError(message: string): void {
    this.sendErrorMessage({ type: 'error', message })
  }

  sendErrorMessage(error: ErrorMessage): void {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify(error))
    }
  }

  sendSnapshot(session: GameSession, events: readonly SimulationEvent[]): void {
    if (this.ws.readyState !== this.ws.OPEN) {
      return
    }
    const message: SnapshotMessage = {
      type: 'snapshot',
      tick: session.snapshot().tick,
      phase: session.phase(),
      units: session.projectUnits(),
      buildings: session.projectBuildings(),
      mineralNodes: session.projectMineralNodes(),
      players: session.projectPlayers(),
      events
    }
    this.ws.send(JSON.stringify(message))
  }

  sendMatchConfig(config: object): void {
    this.ws.send(JSON.stringify(config))
  }
}
