import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">The requested route does not exist.</p>
      <Link className="text-sm text-primary underline-offset-4 hover:underline" to="/">
        Return To Match
      </Link>
    </main>
  )
}
