import type { AssetLibrary } from '@rts/renderer'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { check, registerChecks } from '../../shared/services/checks'
import { useLabContext } from '../../shared/services/lab-context'
import { type ReportFilter, type ReportRow, statusOf, summarizeRows, validateAssetKey } from '../lib/report-check'
import type { SortKey } from '../types/report-table'
import { ContractsTable } from './contracts-table'
import { ReportTable } from './report-table'
import { ReportToolbar } from './report-toolbar'

interface Contract {
  readonly label: string
  readonly keys: readonly string[]
}

const CONTRACTS: readonly Contract[] = [
  {
    label: 'unit idle/run (4 factions × 3 kinds)',
    keys: ['blue', 'red', 'purple', 'yellow'].flatMap((faction) =>
      ['pawn', 'warrior', 'archer'].flatMap((kind) => [
        `units.${faction}.${kind}.${kind}_idle`,
        `units.${faction}.${kind}.${kind}_run`
      ])
    )
  },
  {
    label: 'terrain tileset',
    keys: ['color1', 'color2', 'color3', 'color4', 'color5'].map((color) => `terrain.tileset.${color}`)
  },
  { label: 'terrain water', keys: ['terrain.water.background', 'terrain.water.foam'] },
  { label: 'terrain shadow + rock', keys: ['terrain.shadow', 'terrain.decorations.rock1'] },
  { label: 'fx death', keys: ['fx.explosion_01'] },
  { label: 'HUD wood panel', keys: ['ui.panels.wood_table'] },
  { label: 'HUD bars', keys: ['ui.bars.smallbar_base', 'ui.bars.smallbar_fill'] },
  { label: 'HUD buttons/papers', keys: ['ui.buttons.big_blue', 'ui.buttons.big_blue_pressed', 'ui.papers.regular'] }
]

async function runDeepCheck(
  assets: AssetLibrary,
  onProgress: (message: string) => void
): Promise<readonly ReportRow[]> {
  const collected: ReportRow[] = []
  const keys = assets.keys().slice().sort()
  for (const [index, key] of keys.entries()) {
    const entry = assets.entry(key)
    if (entry === null) {
      continue
    }
    onProgress(`checking ${index + 1}/${keys.length}: ${key}`)
    collected.push({ key, entry, issues: await validateAssetKey(assets, key, entry) })
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  return collected
}

function useReportChecks(assets: AssetLibrary, rows: readonly ReportRow[]): void {
  useEffect(() => {
    registerChecks('manifestReport', () => {
      if (rows.length === 0) {
        return [check('manifest deep check', false, 'run the deep check first')]
      }
      const errors = rows.filter((row) => row.issues.some((issue) => issue.severity === 'error'))
      const warnings = rows.filter((row) => row.issues.some((issue) => issue.severity === 'warning'))
      return [
        check(
          'all assets loaded',
          errors.length === 0,
          errors.length > 0 ? `${errors.length} assets with errors` : `${rows.length}/${rows.length} clean`
        ),
        check(
          'no warnings',
          warnings.length === 0,
          warnings.length > 0 ? `${warnings.length} assets with warnings` : undefined
        )
      ]
    })
    registerChecks('gameMapping', () => {
      const missing = CONTRACTS.flatMap((contract) => contract.keys).filter((key) => assets.entry(key) === null)
      return [
        check(
          'all game contracts resolve',
          missing.length === 0,
          missing.length > 0 ? `missing: ${missing.join(', ')}` : undefined
        )
      ]
    })
  }, [assets, rows])
}

function useSortedRows(
  rows: readonly ReportRow[],
  sortKey: SortKey,
  sortAsc: boolean,
  filter: ReportFilter
): readonly ReportRow[] {
  return useMemo(() => {
    const filtered = rows.filter((row) => statusOf(row) >= filter)
    return [...filtered].sort((a, b) => {
      const first = cellValue(a, sortKey)
      const second = cellValue(b, sortKey)
      let comparison = 0
      if (first < second) {
        comparison = -1
      } else if (first > second) {
        comparison = 1
      }
      return sortAsc ? comparison : -comparison
    })
  }, [rows, sortKey, sortAsc, filter])
}

function cellValue(row: ReportRow, sortKey: SortKey): string | number {
  if (sortKey === 'status') {
    return statusOf(row)
  }
  return sortKey === 'kind' ? row.entry.kind : row.key
}

export function ReportView() {
  const ctx = useLabContext()
  const [rows, setRows] = useState<readonly ReportRow[]>([])
  const [checking, setChecking] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('status')
  const [sortAsc, setSortAsc] = useState(true)
  const [filter, setFilter] = useState<ReportFilter>(0)
  const [statusLine, setStatusLine] = useState('deep check is on-demand — click "run deep check"')

  useReportChecks(ctx.assets, rows)
  const visible = useSortedRows(rows, sortKey, sortAsc, filter)
  const contracts = useMemo(
    () =>
      CONTRACTS.flatMap((contract) =>
        contract.keys.map((key) => ({ label: contract.label, key, found: ctx.assets.entry(key) !== null }))
      ),
    [ctx]
  )

  const startDeepCheck = useCallback(async (): Promise<void> => {
    if (checking) {
      return
    }
    setChecking(true)
    const collected = await runDeepCheck(ctx.assets, setStatusLine)
    setRows(collected)
    setChecking(false)
    setStatusLine(summarizeRows(collected, filter))
  }, [ctx, checking, filter])

  const applyFilter = (value: ReportFilter): void => {
    setFilter(value)
    setStatusLine(summarizeRows(rows, value))
  }

  const toggleSort = (key: SortKey): void => {
    if (sortKey === key) {
      setSortAsc((previous) => !previous)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ReportToolbar checking={checking} filter={filter} onRun={() => void startDeepCheck()} onFilter={applyFilter} />
      <pre className="whitespace-pre-wrap rounded border bg-muted p-3 font-mono text-xs" aria-live="polite">
        {statusLine}
      </pre>
      <ReportTable rows={visible} sortKey={sortKey} sortAsc={sortAsc} onToggleSort={toggleSort} />
      <ContractsTable contracts={contracts} />
    </div>
  )
}
