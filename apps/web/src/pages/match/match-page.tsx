import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { isNewMatchQuery, type MatchLaunch, MatchScreen, parseMatchQuery } from '@/features/match'
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
      navigate(`/match${search}`, { replace: true })
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

export function MatchPage() {
  const location = useLocation()
  const stored = readStoredMatchSession()
  const isNew = isNewMatchQuery(location.search)
  if (isNew) {
    if (stored !== null) {
      return <NewMatchEntry stored={stored} search={location.search} />
    }
    return <MatchScreen launch={{ kind: 'new', query: parseMatchQuery(location.search) }} />
  }
  if (stored === null) {
    return <Navigate to="/?notice=match-required" replace={true} />
  }
  const launch: MatchLaunch = { kind: 'resume', session: stored }
  return <MatchScreen launch={launch} />
}
