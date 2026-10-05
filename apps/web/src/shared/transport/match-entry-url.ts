export function removeNewMatchMarker(): void {
  if (typeof window === 'undefined') {
    return
  }
  const url = new URL(window.location.href)
  if (url.searchParams.get('new') !== '1') {
    return
  }
  url.searchParams.delete('new')
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}
