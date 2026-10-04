import { isMatchReleaseResult } from '@rts/protocol'

export type MatchReleaseOutcome = 'released' | 'missing' | 'failed'

export function releaseMatch(url: string, resumeToken: string): Promise<MatchReleaseOutcome> {
  return new Promise((resolve) => {
    const socket = new WebSocket(url)
    let settled = false
    const finish = (outcome: MatchReleaseOutcome): void => {
      if (settled) {
        return
      }
      settled = true
      socket.close()
      resolve(outcome)
    }
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'match_release', resumeToken }))
    })
    socket.addEventListener('message', (event) => {
      try {
        const parsed: unknown = JSON.parse(String(event.data))
        if (isMatchReleaseResult(parsed)) {
          finish(parsed.released ? 'released' : 'missing')
        }
      } catch {
        finish('failed')
      }
    })
    socket.addEventListener('error', () => finish('failed'))
    socket.addEventListener('close', () => finish('failed'))
  })
}
