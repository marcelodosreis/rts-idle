import type { BenchmarkRow } from './row.js'

const COLUMNS = [
  'entities',
  'avg',
  'p50',
  'p95',
  'p99',
  'max',
  'tick/s',
  'cpu@20',
  'cpu@30',
  'cpu@60',
  'heapMiB',
  'hash',
  'serialize'
] as const

/** Renders the column header line of the results table. */
export function renderHeader(): string {
  return COLUMNS.join(' | ')
}

/** Renders one benchmark row as an aligned table line. */
export function formatRow(row: BenchmarkRow): string {
  const pad = (v: number): string => (v < 10 ? v.toFixed(3) : v.toFixed(1))
  return [
    String(row.entityCount).padStart(7),
    `${pad(row.avgMs)}`.padStart(8),
    `${pad(row.p50Ms)}`.padStart(8),
    `${pad(row.p95Ms)}`.padStart(8),
    `${pad(row.p99Ms)}`.padStart(8),
    `${pad(row.maxMs)}`.padStart(8),
    `${row.ticksPerSecond.toFixed(0)}`.padStart(8),
    `${row.cpuPercentAt20.toFixed(1)}%`.padStart(8),
    `${row.cpuPercentAt30.toFixed(1)}%`.padStart(8),
    `${row.cpuPercentAt60.toFixed(1)}%`.padStart(8),
    `${row.heapDeltaMiB.toFixed(1)}`.padStart(8),
    `${pad(row.hashMs)}`.padStart(8),
    `${pad(row.serializeMs)}`.padStart(8)
  ].join(' | ')
}
