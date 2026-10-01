import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

export function OverviewPanel() {
  return (
    <Card data-testid="overview-card" className="h-full min-h-0 w-full gap-2 overflow-hidden py-2">
      <CardHeader className="h-5 shrink-0 px-3">
        <CardTitle className="text-xs font-medium tracking-widest text-muted-foreground uppercase">OVERVIEW</CardTitle>
      </CardHeader>
      <CardContent className="grid min-h-0 flex-1 place-items-center px-3 pb-1">
        <div
          data-testid="minimap-placeholder"
          className="relative aspect-square w-full max-w-full overflow-hidden rounded-md border border-border/70 bg-muted/35 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:20%_20%]"
        >
          <span className="absolute inset-x-0 bottom-2 text-center text-[10px] text-muted-foreground">
            Map unavailable
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
