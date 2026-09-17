import { Button } from '@/components/ui/button'

const PRODUCTION = ['Build', 'Train', 'Research'] as const
const ORDERS = ['Stop', 'Hold'] as const

function CommandGroup({ label, commands }: { readonly label: string; readonly commands: readonly string[] }) {
  return (
    <div className="flex w-28 shrink-0 flex-col gap-1.5 rounded-xl border border-border/60 bg-muted/30 p-2">
      <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">{label}</span>
      <div className="flex flex-col gap-1.5">
        {commands.map((name) => (
          <Button
            key={name}
            type="button"
            variant="outline"
            size="sm"
            disabled={true}
            className="w-full whitespace-nowrap"
            aria-label={`${name} (coming soon)`}
          >
            {name}
          </Button>
        ))}
      </div>
    </div>
  )
}

/** Action palette: orders and production commands side by side. Disabled until the systems land. */
export function CommandBar() {
  return (
    <div className="flex shrink-0 items-stretch gap-2">
      <CommandGroup label="Orders" commands={ORDERS} />
      <CommandGroup label="Production" commands={PRODUCTION} />
    </div>
  )
}
