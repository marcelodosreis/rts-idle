import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/shared/ui/button'

interface RouteContentBoundaryProps {
  readonly children: ReactNode
}

interface RouteContentBoundaryState {
  readonly hasError: boolean
}

export class RouteContentBoundary extends Component<RouteContentBoundaryProps, RouteContentBoundaryState> {
  override state: RouteContentBoundaryState = { hasError: false }

  static getDerivedStateFromError(): RouteContentBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Route content failed to render', error, info.componentStack)
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div
          data-testid="route-content-error"
          role="alert"
          className="grid min-h-[calc(100vh-8rem)] place-content-center gap-3 text-center"
        >
          <p className="text-sm font-semibold">This page could not be loaded.</p>
          <p className="text-xs text-muted-foreground">Reload the page to try again.</p>
          <Button type="button" className="mx-auto" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
