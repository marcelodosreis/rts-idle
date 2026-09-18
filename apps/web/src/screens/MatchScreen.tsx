import { useRef } from 'react'
import { MatchHud } from '../hud/MatchHud'
import { useMatchSession } from './useMatchSession'

export function MatchScreen() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const { status, unitCount, tick, selectionUnits, resources } = useMatchSession(hostRef)

  return (
    <MatchHud
      status={status}
      unitCount={unitCount}
      tick={tick}
      selection={selectionUnits}
      resources={resources}
      hostRef={hostRef}
    />
  )
}
