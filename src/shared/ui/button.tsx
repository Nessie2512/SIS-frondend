import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

/** Botão (guia 6.2): primário, secundário, discreto, destrutivo; todos os estados desenhados. */
const variantes = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-controlo text-corpo font-medium whitespace-nowrap select-none',
    'transition-[background-color,transform,opacity] duration-(--duracao-micro) ease-padrao',
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]',
  ],
  {
    variants: {
      variante: {
        primario: 'bg-acento text-sobre-acento hover:bg-acento/90',
        secundario: 'bg-superficie text-texto-1 ring-1 ring-contorno hover:bg-fundo',
        discreto: 'text-acento hover:bg-acento/10',
        destrutivo: 'bg-perigo text-sobre-acento hover:bg-perigo/90',
      },
      tamanho: {
        normal: 'h-9 px-4',
        compacto: 'h-8 px-3',
        icone: 'size-9',
      },
    },
    defaultVariants: { variante: 'secundario', tamanho: 'normal' },
  },
)

type Props = ComponentProps<'button'> &
  VariantProps<typeof variantes> & {
    asChild?: boolean
    aCarregar?: boolean
  }

export function Button({
  className,
  variante,
  tamanho,
  asChild = false,
  aCarregar = false,
  disabled,
  children,
  ...props
}: Props) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      className={cn(variantes({ variante, tamanho }), className)}
      disabled={disabled || aCarregar}
      aria-busy={aCarregar || undefined}
      {...props}
    >
      {aCarregar && <LoaderCircle className="animate-spin" aria-hidden />}
      {children}
    </Comp>
  )
}
