import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

/** Esqueleto com as dimensões finais do conteúdo (guia 4.6, 5.6). */
export function Esqueleto({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-controlo bg-linha', className)}
      {...props}
    />
  )
}
