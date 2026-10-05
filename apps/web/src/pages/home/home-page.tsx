import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { newMatchQuery } from '@/shared/lib/match-query'
import { matchEntryState } from '@/shared/transport/match-entry-state'
import { releaseMatch } from '@/shared/transport/match-release'
import { clearMatchResumeState, readStoredMatchSession, type StoredMatchSession } from '@/shared/transport/resume-token'
import { MATCH_SERVER_URL } from '@/shared/transport/server-url'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/shared/ui/alert-dialog'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

function newMatchPath(session: StoredMatchSession | null): string {
  const baseSearch = session?.request.map.source === 'local' ? '?map=local' : ''
  const query =
    session === null
      ? { scenario: 'default', aggression: 'passive' as const, spritesEnabled: true }
      : {
          scenario: session.request.scenarioId,
          aggression: session.request.aggression,
          spritesEnabled: session.spritesEnabled
        }
  return `/match?${newMatchQuery(baseSearch, query)}`
}

function noticeCopy(value: string | null): string | null {
  if (value === 'match-expired') {
    return 'The previous match is no longer available. Start a new match to continue.'
  }
  if (value === 'match-required') {
    return 'Choose Continue or New match before entering the game.'
  }
  return null
}

function useLegacyMatchRedirect(): void {
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.has('scenario') || params.has('aggression') || params.has('sprites') || params.has('map')) {
      params.delete('notice')
      navigate(`/match?${newMatchQuery(params.toString())}`, { replace: true, state: matchEntryState() })
    }
  }, [location.search, navigate])
}

interface NewMatchDialogProps {
  readonly open: boolean
  readonly releasing: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onConfirm: () => void
}

function NewMatchDialog({ open, releasing, onOpenChange, onConfirm }: NewMatchDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start a new match?</AlertDialogTitle>
          <AlertDialogDescription>
            Your current match will be abandoned and its progress cannot be resumed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={releasing}>Keep current match</AlertDialogCancel>
          <AlertDialogAction
            disabled={releasing}
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
          >
            {releasing ? 'Releasing match...' : 'Abandon and start new'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface HomeSessionCardProps {
  readonly session: StoredMatchSession | null
  readonly releaseError: string | null
  readonly onContinue: () => void
  readonly onNewMatch: () => void
}

function HomeSessionCard({ session, releaseError, onContinue, onNewMatch }: HomeSessionCardProps) {
  return (
    <Card className="max-w-2xl border-border/70 bg-card/80 shadow-xl">
      <CardHeader>
        <CardTitle>{session === null ? 'Ready when you are' : 'A match is waiting'}</CardTitle>
        <CardDescription>
          {session === null
            ? 'The game server will only create a session after you choose New match.'
            : `Scenario: ${session.request.scenarioId} · ${session.request.aggression} aggression`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        {session !== null ? (
          <Button type="button" size="lg" className="flex-1" onClick={onContinue}>
            Continue match
          </Button>
        ) : null}
        <Button
          type="button"
          size="lg"
          variant={session === null ? 'default' : 'outline'}
          className="flex-1"
          onClick={onNewMatch}
        >
          New match
        </Button>
      </CardContent>
      {releaseError !== null ? (
        <p role="alert" className="px-6 pb-5 text-sm text-destructive">
          {releaseError}
        </p>
      ) : null}
    </Card>
  )
}

export function HomePage() {
  useLegacyMatchRedirect()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [session] = useState(() => readStoredMatchSession())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [releaseError, setReleaseError] = useState<string | null>(null)
  const notice = noticeCopy(searchParams.get('notice'))

  const startNewMatch = (): void => {
    if (session === null) {
      navigate(newMatchPath(null), { state: matchEntryState() })
      return
    }
    setReleaseError(null)
    setConfirmOpen(true)
  }

  const confirmNewMatch = async (): Promise<void> => {
    if (session === null) {
      navigate(newMatchPath(null), { state: matchEntryState() })
      return
    }
    setReleasing(true)
    const outcome = await releaseMatch(MATCH_SERVER_URL, session.resumeToken)
    if (outcome === 'failed') {
      setReleaseError('The current match could not be released. Check the server and try again.')
      setReleasing(false)
      return
    }
    clearMatchResumeState()
    navigate(newMatchPath(session), { state: matchEntryState() })
  }

  return (
    <main data-testid="home-page" className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-center gap-8">
        <header className="max-w-2xl space-y-4">
          <Badge variant="outline" className="tracking-[0.2em] uppercase">
            RTS Idle
          </Badge>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Command the next move.</h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Continue the match already running in this browser, or deliberately start a new one.
            </p>
          </div>
        </header>

        {notice !== null ? (
          <div
            role="status"
            className="max-w-2xl rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
          >
            {notice}
          </div>
        ) : null}

        <HomeSessionCard
          session={session}
          releaseError={releaseError}
          onContinue={() => navigate('/match', { state: matchEntryState() })}
          onNewMatch={startNewMatch}
        />
      </div>

      <NewMatchDialog
        open={confirmOpen}
        releasing={releasing}
        onOpenChange={setConfirmOpen}
        onConfirm={() => void confirmNewMatch()}
      />
    </main>
  )
}
