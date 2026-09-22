import { type AssetIssue, validateAsset } from '@rts/renderer'
import type { AssetEntry } from '@rts/shared'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { check, registerChecks } from '../core/checks.js'
import { frameRgba } from '../core/pixels.js'
import { useLabContext } from '../lab-context'

interface Row {
  readonly key: string
  readonly entry: AssetEntry
  readonly issues: readonly AssetIssue[]
}

interface Contract {
  readonly label: string
  readonly keys: readonly string[]
}

const CONTRACTS: readonly Contract[] = [
  {
    label: 'unit idle/run (4 factions × 3 kinds)',
    keys: ['blue', 'red', 'purple', 'yellow'].flatMap((f) =>
      ['pawn', 'warrior', 'archer'].flatMap((k) => [`units.${f}.${k}.${k}_idle`, `units.${f}.${k}.${k}_run`])
    )
  },
  {
    label: 'terrain tileset',
    keys: ['color1', 'color2', 'color3', 'color4', 'color5'].map((c) => `terrain.tileset.${c}`)
  },
  { label: 'terrain water', keys: ['terrain.water.background', 'terrain.water.foam'] },
  { label: 'terrain shadow + rock', keys: ['terrain.shadow', 'terrain.decorations.rock1'] },
  { label: 'fx death', keys: ['fx.explosion_01'] },
  { label: 'HUD wood panel', keys: ['ui.panels.wood_table'] },
  { label: 'HUD bars', keys: ['ui.bars.smallbar_base', 'ui.bars.smallbar_fill'] },
  { label: 'HUD buttons/papers', keys: ['ui.buttons.big_blue', 'ui.buttons.big_blue_pressed', 'ui.papers.regular'] }
]

type SortKey = 'key' | 'kind' | 'status'
type Filter = 0 | 1 | 2

function statusOf(row: Row): number {
  if (row.issues.some((i) => i.severity === 'error')) {
    return 2
  }
  if (row.issues.length > 0) {
    return 1
  }
  return 0
}

function statusText(row: Row): string {
  const status = statusOf(row)
  if (status === 0) {
    return 'PASS'
  }
  if (status === 1) {
    return `WARN (${row.issues.map((i) => i.code).join(',')})`
  }
  return `FAIL (${row.issues
    .filter((i) => i.severity === 'error')
    .map((i) => i.code)
    .join(',')})`
}

function statusClass(row: Row): string {
  const status = statusOf(row)
  if (status === 0) {
    return 'text-green-700'
  }
  if (status === 1) {
    return 'text-amber-700'
  }
  return 'text-red-700'
}

export function ReportView() {
  const ctx = useLabContext()
  const [rows, setRows] = useState<Row[]>([])
  const [checking, setChecking] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('status')
  const [sortAsc, setSortAsc] = useState(true)
  const [filter, setFilter] = useState<Filter>(0)
  const [statusLine, setStatusLine] = useState('deep check is on-demand — click "run deep check"')

  const summarize = useCallback((all: Row[], f: Filter): void => {
    const pass = all.filter((r) => statusOf(r) === 0).length
    const warn = all.filter((r) => statusOf(r) === 1).length
    const fail = all.filter((r) => statusOf(r) === 2).length
    const shown = all.filter((r) => statusOf(r) >= f).length
    setStatusLine(`${all.length} assets · pass ${pass} · warn ${warn} · fail ${fail} · showing ${shown}`)
  }, [])

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: sequential validator over all manifest keys
  const runDeepCheck = useCallback(async (): Promise<void> => {
    if (checking) {
      return
    }
    setChecking(true)
    const collected: Row[] = []
    const keys = ctx.assets.keys().slice().sort()
    let done = 0
    for (const key of keys) {
      const entry = ctx.assets.entry(key)
      if (entry === null) {
        continue
      }
      setStatusLine(`checking ${done + 1}/${keys.length}: ${key}`)
      let issues: readonly AssetIssue[] = []
      try {
        const texture = await ctx.assets.texture(key)
        if (texture === null) {
          issues = [{ severity: 'error', code: 'load-failed', message: 'texture failed to load' }]
        } else {
          const image = texture.source.resource as CanvasImageSource
          const geometry = { width: texture.width, height: texture.height }
          const frames: { readonly index: number; readonly rgba: Uint8ClampedArray }[] = []
          if (entry.kind === 'strip') {
            for (let i = 0; i < entry.frames; i += 1) {
              frames.push({
                index: i,
                rgba: await frameRgba(image, { x: i * entry.cellW, y: 0, w: entry.cellW, h: entry.cellH })
              })
            }
          } else if (entry.kind === 'tileset' && entry.columns !== undefined && entry.rows !== undefined) {
            for (let r = 0; r < entry.rows; r += 1) {
              for (let c = 0; c < entry.columns; c += 1) {
                frames.push({
                  index: r * entry.columns + c,
                  rgba: await frameRgba(image, {
                    x: c * entry.cellW,
                    y: r * entry.cellH,
                    w: entry.cellW,
                    h: entry.cellH
                  })
                })
              }
            }
          } else {
            frames.push({ index: 0, rgba: await frameRgba(image, { x: 0, y: 0, w: entry.cellW, h: entry.cellH }) })
          }
          issues = validateAsset(entry, { geometry, frames })
        }
      } catch (error) {
        issues = [
          { severity: 'error', code: 'exception', message: error instanceof Error ? error.message : String(error) }
        ]
      }
      collected.push({ key, entry, issues })
      done += 1
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    setRows(collected)
    setChecking(false)
    summarize(collected, filter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, checking, filter, summarize])

  useEffect(() => {
    registerChecks('manifestReport', () => {
      if (rows.length === 0) {
        return [check('manifest deep check', false, 'run the deep check first')]
      }
      const errors = rows.filter((r) => r.issues.some((i) => i.severity === 'error'))
      const warnings = rows.filter((r) => r.issues.some((i) => i.severity === 'warning'))
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
      const missing: string[] = []
      for (const contract of CONTRACTS) {
        for (const key of contract.keys) {
          if (ctx.assets.entry(key) === null) {
            missing.push(key)
          }
        }
      }
      return [
        check(
          'all game contracts resolve',
          missing.length === 0,
          missing.length > 0 ? `missing: ${missing.join(', ')}` : undefined
        )
      ]
    })
  }, [ctx, rows])

  const visible = useMemo(() => {
    const filtered = rows.filter((row) => statusOf(row) >= filter)
    return [...filtered].sort((a, b) => {
      const cellValue = (row: Row): string | number => {
        if (sortKey === 'status') {
          return statusOf(row)
        }
        if (sortKey === 'kind') {
          return row.entry.kind
        }
        return row.key
      }
      const va = cellValue(a)
      const vb = cellValue(b)
      let cmp = 0
      if (va < vb) {
        cmp = -1
      } else if (va > vb) {
        cmp = 1
      }
      return sortAsc ? cmp : -cmp
    })
  }, [rows, sortKey, sortAsc, filter])

  const contracts = useMemo(() => {
    return CONTRACTS.flatMap((c) =>
      c.keys.map((key) => ({ label: c.label, key, found: ctx.assets.entry(key) !== null }))
    )
  }, [ctx])

  const toggleSort = (key: SortKey): void => {
    if (sortKey === key) {
      setSortAsc((v) => !v)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" disabled={checking} onClick={() => void runDeepCheck()}>
          {checking ? 'checking…' : 'run deep check (loads all assets)'}
        </Button>
        <div className="flex gap-1">
          {(
            [
              ['all', 0],
              ['warn+', 1],
              ['fail', 2]
            ] as const
          ).map(([label, value]) => (
            <Button
              key={label}
              size="sm"
              variant={filter === value ? 'default' : 'outline'}
              onClick={() => {
                setFilter(value)
                summarize(rows, value)
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <pre className="rounded border bg-muted p-3 font-mono text-xs whitespace-pre-wrap" aria-live="polite">
        {statusLine}
      </pre>

      <div className="max-h-96 overflow-y-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => toggleSort('key')} className="cursor-pointer select-none">
                key {sortKey === 'key' && (sortAsc ? '↑' : '↓')}
              </TableHead>
              <TableHead onClick={() => toggleSort('kind')} className="cursor-pointer select-none">
                kind {sortKey === 'kind' && (sortAsc ? '↑' : '↓')}
              </TableHead>
              <TableHead onClick={() => toggleSort('status')} className="cursor-pointer select-none">
                status {sortKey === 'status' && (sortAsc ? '↑' : '↓')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.key} title={row.issues.map((i) => `${i.code} — ${i.message}`).join('\n')}>
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
              {contracts.map((c) => (
                <TableRow key={c.key}>
                  <TableCell className="text-xs">{c.label}</TableCell>
                  <TableCell className="font-mono text-xs">{c.key}</TableCell>
                  <TableCell className={c.found ? 'text-green-700 text-xs' : 'text-red-700 text-xs'}>
                    {c.found ? 'FOUND' : 'MISSING'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
