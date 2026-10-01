import {
  DeterminismFeature,
  RendererPerformanceFeature,
  RendererStressFeature
} from '../../../features/laboratory/diagnostics'
import { LaboratoryLayout } from '../../../shared/components/laboratory-layout'

export function DiagnosticsPage() {
  return (
    <LaboratoryLayout title="Diagnostics">
      <div className="space-y-6">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Renderer lab</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Renderer diagnostics</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Three focused tools for checking visual load, reproducibility, and renderer frame time.
          </p>
        </header>

        <section className="space-y-4 rounded-lg border border-border/60 bg-card p-5" aria-labelledby="stress-heading">
          <div>
            <h2 id="stress-heading" className="text-lg font-semibold">
              Stress Test
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Renders animated sprites to exercise the renderer and inspect FPS, zoom, and camera behavior.
            </p>
          </div>
          <RendererStressFeature />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-label="Performance diagnostic">
            <RendererPerformanceFeature />
          </section>
          <section aria-label="Determinism diagnostic">
            <DeterminismFeature />
          </section>
        </div>
      </div>
    </LaboratoryLayout>
  )
}
