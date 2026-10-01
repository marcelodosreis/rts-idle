import { useState } from 'react'
import { CollapsibleSection } from '@/shared/ui/collapsible-section'
import { ScrollArea } from '@/shared/ui/scroll-area'
import type { MessageLogEntry } from '../../hooks/use-message-log'

interface ServerLogSectionProps {
  readonly messageLog: readonly MessageLogEntry[]
  readonly tick: number
}

function timestamp(value: number): string {
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function messageClass(type: MessageLogEntry['type']): string {
  if (type === 'error') {
    return 'text-destructive'
  }
  if (type === 'command') {
    return 'text-blue-400'
  }
  if (type === 'event') {
    return 'text-amber-400'
  }
  return 'text-foreground'
}

export function ServerLogSection({ messageLog, tick }: ServerLogSectionProps) {
  const [open, setOpen] = useState(false)
  return (
    <CollapsibleSection
      headingId="game-devtools-log-heading"
      contentId="game-devtools-log-content"
      label="Server Log"
      open={open}
      onToggle={() => setOpen((value) => !value)}
      trailing={<span className="ml-auto text-xs tabular-nums text-muted-foreground">Tick: {tick}</span>}
    >
      <ScrollArea className="h-44 rounded-md border border-border/60 bg-muted/20">
        {messageLog.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No messages yet.</p>
        ) : (
          <ul className="divide-y">
            {messageLog.map((entry) => (
              <li
                key={`${entry.timestamp}-${entry.message}`}
                className="flex gap-2 px-3 py-1.5"
                role={entry.type === 'error' ? 'alert' : undefined}
              >
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {timestamp(entry.timestamp)}
                </span>
                <span className={`text-xs ${messageClass(entry.type)}`}>{entry.message}</span>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </CollapsibleSection>
  )
}
