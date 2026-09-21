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
    selectedConstruction,
    selectedMineral,
    resources,
    commandMode,
    matchResult,
    scenario,
    scenarios,
    aggression,
    spritesEnabled,
    buildings,
    buildHint,
    arm,
    issueOrder,
    surrender,
    newMatch,
    changeScenario,
    setAggression,
    setSpritesEnabled
  } = useMatchSession(hostRef)

  return (
    <MatchHud
      status={status}
      unitCount={unitCount}
      tick={tick}
      selection={selectionUnits}
      construction={selectedConstruction}
      mineral={selectedMineral}
      resources={resources}
      hostRef={hostRef}
      commandMode={commandMode}
      matchResult={matchResult}
      scenario={scenario}
      scenarios={scenarios}
      aggression={aggression}
      spritesEnabled={spritesEnabled}
      onStop={() => issueOrder('STOP')}
      onHold={() => issueOrder('HOLD')}
      onSurrender={surrender}
      onArm={arm}
      workerSelected={
        selectionUnits.length === 1 && selectionUnits[0]?.kind === 'pawn' && selectionUnits[0]?.owner === 0
      }
      buildings={buildings}
      buildHint={buildHint}
      onNewMatch={newMatch}
      onChangeScenario={changeScenario}
      onToggleAggression={() => setAggression(aggression === 'offensive' ? 'passive' : 'offensive')}
      onToggleSprites={() => setSpritesEnabled(!spritesEnabled)}
    />
  )
}
