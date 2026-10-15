import { cva, type VariantProps } from 'class-variance-authority'
import { Circle, CircleAlert, CircleCheck, CircleDot, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

const variantes = cva(
  'inline-flex h-6 items-center gap-1 rounded-full px-2 text-legenda whitespace-nowrap [&_svg]:size-3.5 [&_svg]:stroke-[1.5]',
  {
    variants: {
      tom: {
        // O texto fica sempre em texto-1 (contraste garantido); a cor vive no ícone e no fundo
        neutra: 'bg-linha text-texto-2',
        accao: 'bg-acento/10 text-texto-1 [&_svg]:text-acento',
        sucesso: 'bg-sucesso/10 text-texto-1 [&_svg]:text-sucesso',
        aviso: 'bg-aviso/10 text-texto-1 [&_svg]:text-aviso',
        perigo: 'bg-perigo/10 text-texto-1 [&_svg]:text-perigo',
      },
    },
    defaultVariants: { tom: 'neutra' },
  },
)

const ICONE = {
  neutra: Circle,
  accao: CircleDot,
  sucesso: CircleCheck,
  aviso: TriangleAlert,
  perigo: CircleAlert,
} as const

type Props = VariantProps<typeof variantes> & { children: ReactNode; className?: string }

/** Etiqueta de estado (guia 6.2, 8.1): sempre ícone e texto, nunca só cor. */
export function EtiquetaEstado({ tom, children, className }: Props) {
  const Icone = ICONE[tom ?? 'neutra']
  return (
    <span className={cn(variantes({ tom }), className)}>
      <Icone aria-hidden />
      {children}
    </span>
  )
}
