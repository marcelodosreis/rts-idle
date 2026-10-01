import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import type { ContractRow } from '../types/report-table'

interface ContractsTableProps {
  readonly contracts: readonly ContractRow[]
}

export function ContractsTable({ contracts }: ContractsTableProps) {
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
