import { cva } from 'class-variance-authority'
import { Avatar as AvatarRadix } from 'radix-ui'
import { cn } from '@/shared/lib/cn'

interface Props {
  nome: string
  /** Miniatura; nunca a fotografia em tamanho real (guia 5.6) */
  fotografia?: string | null
  tamanho?: 'pequeno' | 'normal' | 'grande'
  className?: string
}

const classesTamanho = cva('', {
  variants: {
    tamanho: {
      pequeno: 'size-6 text-legenda',
      normal: 'size-8 text-secundario',
      grande: 'size-16 text-titulo-seccao',
    },
  },
})

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : ''
  return (primeira + ultima).toUpperCase()
}

/** Avatar (guia 6.2): fotografia ou iniciais, com dimensões fixas para não saltar ao carregar. */
export function Avatar({ nome, fotografia, tamanho = 'normal', className }: Props) {
  return (
    <AvatarRadix.Root
      className={cn(
        'inline-flex shrink-0 overflow-hidden rounded-full bg-linha align-middle',
        classesTamanho({ tamanho }),
        className,
      )}
    >
      {fotografia && (
        <AvatarRadix.Image
          src={fotografia}
          alt={nome}
          loading="lazy"
          className="size-full object-cover"
        />
      )}
      <AvatarRadix.Fallback
        delayMs={fotografia ? 300 : 0}
        className="flex size-full items-center justify-center font-semibold text-texto-2"
      >
        <span aria-hidden>{iniciais(nome)}</span>
        <span className="sr-only">{nome}</span>
      </AvatarRadix.Fallback>
    </AvatarRadix.Root>
  )
}
