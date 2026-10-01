import { Link } from 'react-router-dom'

export function LaboratoryHeader({ title }: { readonly title: string }) {
  return (
    <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b bg-card/70 py-2 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-2">
            <span aria-hidden={true} className="text-sm text-primary">
              ◆
            </span>
            <h1 className="text-sm font-semibold tracking-widest text-foreground uppercase">RTS Idle Laboratory</h1>
          </div>
          <span data-testid="laboratory-page-title" className="text-xs text-muted-foreground">
            {title}
          </span>
        </div>
        <Link
          className="ml-auto flex items-center whitespace-nowrap rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          to="/"
        >
          Return To Match
        </Link>
      </div>
    </header>
  )
}
