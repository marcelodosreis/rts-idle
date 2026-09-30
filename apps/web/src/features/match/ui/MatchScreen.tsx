import { type RefObject, useRef } from 'react'
import { type MatchSessionState, useMatchSession } from '../lifecycle/useMatchSession'
import { MatchHud, type MatchHudProps } from './MatchHud'

function buildHudProps(session: MatchSessionState, hostRef: RefObject<HTMLDivElement | null>): MatchHudProps {
  const { aggression } = session
  return {
    status: session.status,
    messageLog: session.messageLog,
    unitCount: session.unitCount,
    tick: session.tick,
    selection: session.selectionUnits,
    construction: session.selectedConstruction,
    mineral: session.selectedMineral,
    resources: session.resources,
    hudFeedback: session.hudFeedback,
    hostRef,
    commandMode: session.commandMode,
    matchResult: session.matchResult,
    scenario: session.scenario,
    scenarios: session.scenarios,
    aggression,
    spritesEnabled: session.spritesEnabled,
    inputProfile: session.inputProfile,
    onStop: () => session.issueOrder('STOP'),
    onHold: () => session.issueOrder('HOLD'),
    onSurrender: session.surrender,
    onArm: session.arm,
    onCancelConstruction: session.cancelConstruction,
    onCancelProduction: session.cancelProduction,
    onUpgradeCastle: session.upgradeCastle,
    onResearch: session.research,
    onCancelResearch: session.cancelResearch,
    onTrain: session.train,
    onSetRally: (producerId) => session.arm({ kind: 'rally', producerId }),
    buildings: session.buildings,
    production: session.production,
    research: session.researchCatalog,
    buildHint: session.buildHint,
    onNewMatch: session.newMatch,
    onChangeScenario: session.changeScenario,
    onToggleAggression: () => session.setAggression(aggression === 'offensive' ? 'passive' : 'offensive'),
    onToggleSprites: () => session.setSpritesEnabled(!session.spritesEnabled),
    onInputProfileChange: session.setInputProfile
  }
}

export function MatchScreen() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const session = useMatchSession(hostRef)
  return <MatchHud {...buildHudProps(session, hostRef)} />
}
