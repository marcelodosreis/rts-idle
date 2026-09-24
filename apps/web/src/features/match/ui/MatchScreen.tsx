import { useRef } from 'react'
import { useMatchSession } from '../lifecycle/useMatchSession'
import { MatchHud } from './MatchHud'

export function MatchScreen() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const {
    status,
    messageLog,
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
    inputProfile,
    buildings,
    buildHint,
    arm,
    issueOrder,
    cancelConstruction,
    surrender,
    newMatch,
    changeScenario,
    setAggression,
    setSpritesEnabled,
    setInputProfile
  } = useMatchSession(hostRef)

  return (
    <MatchHud
      status={status}
      messageLog={messageLog}
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
      inputProfile={inputProfile}
      onStop={() => issueOrder('STOP')}
      onHold={() => issueOrder('HOLD')}
      onSurrender={surrender}
      onArm={arm}
      onCancelConstruction={cancelConstruction}
      workerSelected={
        selectionUnits.length === 1 && selectionUnits[0]?.kind === 'pawn' && selectionUnits[0]?.owner === 0
      }
      buildings={buildings}
      buildHint={buildHint}
      onNewMatch={newMatch}
      onChangeScenario={changeScenario}
      onToggleAggression={() => setAggression(aggression === 'offensive' ? 'passive' : 'offensive')}
      onToggleSprites={() => setSpritesEnabled(!spritesEnabled)}
      onInputProfileChange={setInputProfile}
    />
  )
}
