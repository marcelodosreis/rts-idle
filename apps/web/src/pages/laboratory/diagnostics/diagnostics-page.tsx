import {
  DeterminismFeature,
  RendererPerformanceFeature,
  RendererStressFeature
} from '../../../features/laboratory/diagnostics'
import { LaboratoryLayout } from '../../../shared/components/laboratory-layout'

export function DiagnosticsPage() {
  return (
    <LaboratoryLayout title="Diagnostics">
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <header className="max-w-3xl shrink-0">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Renderer lab</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Renderer diagnostics</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Three focused tools for checking visual load, reproducibility, and renderer frame time.
          </p>
        </header>

        <div className="grid min-h-0 flex-1 gap-2 overflow-hidden lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <section
            className="min-h-0 overflow-auto rounded-lg border border-border/60 bg-card p-3"
            aria-labelledby="stress-heading"
          >
            <div>
              <h2 id="stress-heading" className="text-base font-semibold">
                Stress Test
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Renders animated sprites to exercise the renderer and inspect FPS, zoom, and camera behavior.
              </p>
            </div>
            <RendererStressFeature />
          </section>

          <div className="grid min-h-0 gap-2 overflow-auto">
            <section className="min-h-0 overflow-auto" aria-label="Performance diagnostic">
              <RendererPerformanceFeature />
            </section>
            <section className="min-h-0 overflow-auto" aria-label="Determinism diagnostic">
              <DeterminismFeature />
            </section>
          </div>
        </div>
      </div>
    </LaboratoryLayout>
  )
}
