import { Button } from '@/shared/ui/button'
import type { ReportFilter } from '../lib/report-check'

interface ReportToolbarProps {
  readonly checking: boolean
  readonly filter: ReportFilter
  readonly onRun: () => void
  readonly onFilter: (value: ReportFilter) => void
}

export function ReportToolbar({ checking, filter, onRun, onFilter }: ReportToolbarProps) {
  const options = [
    ['all', 0],
    ['warn+', 1],
    ['fail', 2]
  ] as const
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" disabled={checking} onClick={onRun}>
        {checking ? 'checking…' : 'run deep check (loads all assets)'}
      </Button>
      <div className="flex gap-1">
        {options.map(([label, value]) => (
          <Button
            key={label}
            size="sm"
            variant={filter === value ? 'default' : 'outline'}
            onClick={() => onFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  )
}
