import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { type ReportRow, statusClass, statusText } from '../lib/report-check'
import type { SortKey } from '../types/report-table'

interface ReportTableProps {
  readonly rows: readonly ReportRow[]
  readonly sortKey: SortKey
  readonly sortAsc: boolean
  readonly onToggleSort: (key: SortKey) => void
}

export function ReportTable({ rows, sortKey, sortAsc, onToggleSort }: ReportTableProps) {
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
