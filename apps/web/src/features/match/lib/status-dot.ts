export function statusDot(status: string): string {
  if (status === 'connected') {
    return 'bg-emerald-500'
  }
  return status.startsWith('error') ? 'bg-destructive' : 'bg-amber-500'
}
