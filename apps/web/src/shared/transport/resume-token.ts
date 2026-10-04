const RESUME_TOKEN_KEY = 'rts-idle.resume-token'

export function clearMatchResumeToken(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(RESUME_TOKEN_KEY)
  }
}

export function startNewMatch(reload: () => void): void {
  clearMatchResumeToken()
  reload()
}

export function storedResumeToken(): string | undefined {
  if (typeof sessionStorage === 'undefined') {
    return undefined
  }
  return sessionStorage.getItem(RESUME_TOKEN_KEY) ?? undefined
}

export function saveResumeToken(token: string): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(RESUME_TOKEN_KEY, token)
  }
}
