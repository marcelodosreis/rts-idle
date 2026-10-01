import { useCallback } from 'react'
import { Button } from '@/shared/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import type { TerrainController, TerrainState } from '../types/terrain-editor-data'

interface HistoryButtonsProps {
  readonly controller: TerrainController | null
  readonly onStateChange: (patch: Partial<TerrainState>) => void
}

export function HistoryButtons({ controller, onStateChange }: HistoryButtonsProps) {
  const undo = useCallback(() => {
    if (controller?.undo() !== null) {
      onStateChange({})
    }
  }, [controller, onStateChange])
  const redo = useCallback(() => {
    if (controller?.redo() !== null) {
      onStateChange({})
    }
  }, [controller, onStateChange])
  return (
    <div className="grid w-full grid-cols-2 gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <Button variant="outline" size="sm" className="h-8 w-full text-[10px]" onClick={undo}>
            <span aria-hidden="true">↶</span>Undo
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Undo <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">Ctrl+Z</kbd>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <Button variant="outline" size="sm" className="h-8 w-full text-[10px]" onClick={redo}>
            <span aria-hidden="true">↷</span>Redo
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Redo <kbd className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">Ctrl+Shift+Z</kbd>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
