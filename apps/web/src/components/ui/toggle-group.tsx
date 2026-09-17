import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import type * as React from 'react'
import { cn } from '@/lib/utils'

function ToggleGroup({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & {
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        'group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs',
        className
      )}
      {...props}
    />
  )
}

function ToggleGroupItem({
  className,
  children,
  variant = 'default',
  size = 'default',
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & {
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={variant}
      data-size={size}
      className={cn(
        'focus-visible:border-ring focus-visible:ring-ring/50 data-[variant=outline]:border data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:border-transparent min-w-0 flex-1 shrink-0 items-center justify-center gap-1.5 rounded-sm px-2 py-1 text-sm font-medium transition-all outline-none hover:bg-muted hover:text-muted-foreground focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 data-[size=lg]:h-10',
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
