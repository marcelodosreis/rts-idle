import { type ReactNode, useCallback, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/shared/ui/alert-dialog'
import type { TerrainController } from '../types/terrain-editor-data'

interface LevelModalProps {
  readonly mode: 'export' | 'import'
  readonly controller: TerrainController | null
  readonly onClose: () => void
  readonly onImport: (text: string) => void
}

function levelDataJson(controller: TerrainController, format: 'lab' | 'game'): string {
  return format === 'game' ? JSON.stringify(controller.exportMapDefinition()) : JSON.stringify(controller.exportLevel())
}

export function LevelModal({ mode, controller, onClose, onImport }: LevelModalProps) {
  const [format, setFormat] = useState<'lab' | 'game'>('lab')
  const [text, setText] = useState(() =>
    mode === 'export' && controller !== null ? levelDataJson(controller, 'lab') : ''
  )
  const switchFormat = (next: 'lab' | 'game'): void => {
    setFormat(next)
    if (mode === 'export' && controller !== null) {
      setText(levelDataJson(controller, next))
    }
  }
  const copy = useCallback(async (): Promise<void> => {
    await navigator.clipboard.writeText(text)
    onClose()
  }, [text, onClose])
  const importLevel = useCallback((): void => {
    onImport(text)
    onClose()
  }, [text, onImport, onClose])
  const formatButton = (value: 'lab' | 'game', label: string): ReactNode => (
    <button
      type="button"
      className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${format === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
      onClick={() => switchFormat(value)}
    >
      {label}
    </button>
  )
  return (
    <AlertDialog open={true} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{mode === 'export' ? 'Copy Level' : 'Paste Level'}</AlertDialogTitle>
          <AlertDialogDescription>
            {mode === 'export'
              ? 'Copy the current level data to your clipboard.'
              : 'Paste level data to load it into the editor.'}
          </AlertDialogDescription>
          <div className="flex w-fit gap-1 rounded-lg bg-muted/50 p-0.5">
            {formatButton('lab', 'Lab')}
            {formatButton('game', 'Game')}
          </div>
        </AlertDialogHeader>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          readOnly={mode === 'export'}
          className="h-[200px] w-full resize-none rounded-lg border border-border/50 bg-muted/30 p-3 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder={mode === 'import' ? 'Paste level JSON here…' : ''}
        />
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          {mode === 'export' ? (
            <AlertDialogAction onClick={copy}>Copy to Clipboard</AlertDialogAction>
          ) : (
            <AlertDialogAction onClick={importLevel} disabled={!text.trim()}>
              Load Level
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
