import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RouteLoading } from '../app/loading'

const MatchPage = lazy(() => import('../pages/match/MatchPage'))
const AssetBrowserPage = lazy(() => import('../pages/laboratory/browser/AssetBrowserPage'))
const MapEditorPage = lazy(() => import('../pages/laboratory/editor/MapEditorPage'))
const DiagnosticsPage = lazy(() => import('../pages/laboratory/diagnostics/DiagnosticsPage'))
const AssetReportPage = lazy(() => import('../pages/laboratory/report/AssetReportPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

export function AppRouter() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/" element={<MatchPage />} />
        <Route path="/laboratory" element={<AssetBrowserPage />} />
        <Route path="/laboratory/editor" element={<MapEditorPage />} />
        <Route path="/laboratory/diagnostics" element={<DiagnosticsPage />} />
        <Route path="/laboratory/report" element={<AssetReportPage />} />
        <Route path="/laboratory/stress" element={<Navigate to="/laboratory/diagnostics" replace={true} />} />
        <Route path="/laboratory/determinism" element={<Navigate to="/laboratory/diagnostics" replace={true} />} />
        <Route path="/laboratory/performance" element={<Navigate to="/laboratory/diagnostics" replace={true} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
