import type * as React from 'react'
import { cn } from '@/shared/lib/utils'

function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentProps<'div'> & {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
}) {
  return (
    <div
      role={decorative ? 'none' : 'separator'}
      data-slot="separator"
      {...(decorative ? {} : { 'aria-orientation': orientation })}
      className={cn('bg-border shrink-0', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)}
      {...props}
    />
  )
}

export { Separator }
