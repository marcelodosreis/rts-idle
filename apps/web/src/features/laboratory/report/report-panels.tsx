import { Button } from '@/shared/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { type ReportFilter, type ReportRow, statusClass, statusText } from './report-check.js'

export type SortKey = 'key' | 'kind' | 'status'

export interface ContractRow {
  readonly label: string
  readonly key: string
  readonly found: boolean
}

export function ReportToolbar({
  checking,
  filter,
  onRun,
  onFilter
}: {
  readonly checking: boolean
  readonly filter: ReportFilter
  readonly onRun: () => void
  readonly onFilter: (value: ReportFilter) => void
}) {
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

export function ReportTable({
  rows,
  sortKey,
  sortAsc,
  onToggleSort
}: {
  readonly rows: readonly ReportRow[]
  readonly sortKey: SortKey
  readonly sortAsc: boolean
  readonly onToggleSort: (key: SortKey) => void
}) {
  const arrow = (key: SortKey): string => {
    if (sortKey !== key) {
      return ''
    }
    return sortAsc ? '↑' : '↓'
  }
  return (
    <div className="max-h-96 overflow-y-auto rounded border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => onToggleSort('key')} className="cursor-pointer select-none">
              key {arrow('key')}
            </TableHead>
            <TableHead onClick={() => onToggleSort('kind')} className="cursor-pointer select-none">
              kind {arrow('kind')}
            </TableHead>
            <TableHead onClick={() => onToggleSort('status')} className="cursor-pointer select-none">
              status {arrow('status')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key} title={row.issues.map((issue) => `${issue.code} — ${issue.message}`).join('\n')}>
              <TableCell className="font-mono text-xs">{row.key}</TableCell>
              <TableCell className="text-xs">{row.entry.kind}</TableCell>
              <TableCell className="text-xs">
                <span className={statusClass(row)}>{statusText(row)}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function ContractsTable({ contracts }: { readonly contracts: readonly ContractRow[] }) {
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">Game contracts (keys the renderer/HUD resolve today):</p>
      <div className="max-h-72 overflow-y-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>contract</TableHead>
              <TableHead>key</TableHead>
              <TableHead>status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.key}>
                <TableCell className="text-xs">{contract.label}</TableCell>
                <TableCell className="font-mono text-xs">{contract.key}</TableCell>
                <TableCell className={contract.found ? 'text-xs text-green-700' : 'text-xs text-red-700'}>
                  {contract.found ? 'FOUND' : 'MISSING'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
