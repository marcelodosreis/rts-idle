import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { isNewMatchQuery, type MatchLaunch, MatchScreen, parseMatchQuery } from '@/features/match'
import { isMatchEntryState, matchEntryState } from '@/shared/transport/match-entry-state'
import { releaseMatch } from '@/shared/transport/match-release'
import { clearMatchResumeState, readStoredMatchSession, type StoredMatchSession } from '@/shared/transport/resume-token'
import { MATCH_SERVER_URL } from '@/shared/transport/server-url'

function NewMatchEntry({ stored, search }: { readonly stored: StoredMatchSession; readonly search: string }) {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void releaseMatch(MATCH_SERVER_URL, stored.resumeToken).then((outcome) => {
      if (!active) {
        return
      }
      if (outcome === 'failed') {
        setError('The previous match could not be abandoned. Return to the start screen and try again.')
        return
      }
      clearMatchResumeState()
      navigate(`/match${search}`, { replace: true, state: matchEntryState() })
    })
    return () => {
      active = false
    }
  }, [navigate, search, stored.resumeToken])

  if (error !== null) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
        <p role="alert" className="max-w-md text-center text-sm text-destructive">
          {error}
        </p>
      </main>
    )
  }
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <p role="status" className="text-sm text-muted-foreground">
        Preparing a new match...
      </p>
    </main>
  )
}

interface ResumeLaunchCache {
  token: string | null
  spritesEnabled: boolean | null
  value: MatchLaunch | null
}

function useResumeLaunch(stored: StoredMatchSession | null): MatchLaunch | null {
  const cache = useRef<ResumeLaunchCache>({ token: null, spritesEnabled: null, value: null })
  const token = stored?.resumeToken ?? null
  const spritesEnabled = stored?.spritesEnabled ?? null
  if (cache.current.token !== token || cache.current.spritesEnabled !== spritesEnabled) {
    cache.current = {
      token,
      spritesEnabled,
      value: stored === null ? null : { kind: 'resume', session: stored }
    }
  }
  return cache.current.value
}

export function MatchPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const acceptedEntryRef = useRef(false)
  const enteredFromHome = isMatchEntryState(location.state)
  const hasAcceptedEntry = acceptedEntryRef.current || enteredFromHome

  useEffect(() => {
    if (!enteredFromHome) {
      return
    }
    acceptedEntryRef.current = true
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: null }
    )
  }, [enteredFromHome, location.hash, location.pathname, location.search, navigate])

  const stored = readStoredMatchSession()
  const isNew = isNewMatchQuery(location.search)
  const newLaunch = useMemo<MatchLaunch>(
    () => ({ kind: 'new', query: parseMatchQuery(location.search) }),
    [location.search]
  )
  const resumeLaunch = useResumeLaunch(stored)

  if (!hasAcceptedEntry) {
    return <Navigate to="/" replace={true} />
  }

  if (isNew) {
    if (stored !== null) {
      return <NewMatchEntry stored={stored} search={location.search} />
    }
    return <MatchScreen launch={newLaunch} />
  }
  if (resumeLaunch === null) {
    return <Navigate to="/?notice=match-required" replace={true} />
  }
  return <MatchScreen launch={resumeLaunch} />
}
