import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AssetBrowserPage } from '@/pages/laboratory/browser/asset-browser-page'
import { RouteLoading } from '../app/loading'

const MatchPage = lazy(() => import('@/pages/match/match-page').then((module) => ({ default: module.MatchPage })))
const MapEditorPage = lazy(() =>
  import('@/pages/laboratory/editor/map-editor-page').then((module) => ({ default: module.MapEditorPage }))
)
const DiagnosticsPage = lazy(() =>
  import('@/pages/laboratory/diagnostics/diagnostics-page').then((module) => ({ default: module.DiagnosticsPage }))
)
const AssetReportPage = lazy(() =>
  import('@/pages/laboratory/report/asset-report-page').then((module) => ({ default: module.AssetReportPage }))
)
const NotFoundPage = lazy(() => import('@/pages/not-found-page').then((module) => ({ default: module.NotFoundPage })))

export function AppRouter() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/" element={<MatchPage />} />
        <Route path="/laboratory" element={<AssetBrowserPage />} />
        <Route path="/laboratory/editor" element={<MapEditorPage />} />
        <Route path="/laboratory/diagnostics" element={<DiagnosticsPage />} />
        <Route path="/laboratory/report" element={<AssetReportPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
