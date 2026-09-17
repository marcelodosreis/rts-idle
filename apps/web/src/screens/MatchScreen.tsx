import { useRef } from 'react'
import { useMatchSession } from './useMatchSession'

export function MatchScreen() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const { status, unitCount, selectedCount } = useMatchSession(hostRef)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
        status: {status} · units: {unitCount} · selected: {selectedCount}
      </div>
      <div ref={hostRef} style={{ flex: 1, minHeight: 0 }} />
    </div>
  )
}
