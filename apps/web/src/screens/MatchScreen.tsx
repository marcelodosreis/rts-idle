import { useRef } from 'react'
import { MatchHud } from '../hud/MatchHud'
import { useMatchSession } from './useMatchSession'

export function MatchScreen() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const {
    status,
    unitCount,
    tick,
    selectionUnits,
    resources,
    commandMode,
    matchResult,
    scenario,
    scenarios,
    arm,
    issueOrder,
    surrender,
    newMatch,
    changeScenario
  } = useMatchSession(hostRef)

  return (
    <MatchHud
      status={status}
      unitCount={unitCount}
      tick={tick}
      selection={selectionUnits}
      resources={resources}
      hostRef={hostRef}
      commandMode={commandMode}
      matchResult={matchResult}
      scenario={scenario}
      scenarios={scenarios}
      onStop={() => issueOrder('STOP')}
      onHold={() => issueOrder('HOLD')}
      onSurrender={surrender}
      onArm={arm}
      onNewMatch={newMatch}
      onChangeScenario={changeScenario}
    />
  )
}
