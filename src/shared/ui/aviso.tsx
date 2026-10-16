import { useLingui } from '@lingui/react/macro'
import { cva, type VariantProps } from 'class-variance-authority'
import { CircleAlert, Info, Lock, TriangleAlert, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

const variantes = cva(
  'flex items-start gap-3 text-corpo [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:stroke-[1.5]',
  {
    variants: {
      tom: {
        informacao: '[&>svg]:text-acento',
        aviso: '[&>svg]:text-aviso',
        erro: '[&>svg]:text-perigo',
        leitura: '[&>svg]:text-texto-2',
      },
      forma: {
        /** Aviso dentro do conteúdo */
        aviso: 'rounded-cartao bg-superficie p-4 ring-1 ring-linha',
        /** Faixa discreta no topo de uma área (sem ligação, modo de leitura) */
        faixa: 'border-b border-linha bg-superficie px-6 py-2 text-secundario',
      },
    },
    defaultVariants: { tom: 'informacao', forma: 'aviso' },
  },
)

const ICONE = { informacao: Info, aviso: TriangleAlert, erro: CircleAlert, leitura: Lock } as const

type Props = VariantProps<typeof variantes> & {
  titulo?: string
  children: ReactNode
  accao?: ReactNode
  /** Quando existe, mostra o botão de fechar */
  aoDispensar?: () => void
  className?: string
}

/** Aviso e faixa (guia 6.2): informação, aviso, erro e modo de leitura, com acção e dispensável. */
export function Aviso({ tom, forma, titulo, children, accao, aoDispensar, className }: Props) {
  const { t } = useLingui()
  const Icone = ICONE[tom ?? 'informacao']
  // Erros anunciam-se de imediato; o resto educadamente
  const papel = tom === 'erro' ? 'alert' : 'status'
  return (
    <div role={papel} className={cn(variantes({ tom, forma }), className)}>
      <Icone aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {titulo && <p className="font-semibold">{titulo}</p>}
        <div className="text-texto-2">{children}</div>
      </div>
      {accao && <div className="shrink-0">{accao}</div>}
      {aoDispensar && (
        <button
          type="button"
          onClick={aoDispensar}
          aria-label={t`Dispensar`}
          className="-m-1 shrink-0 rounded-controlo p-1 text-texto-3 hover:text-texto-1 [&_svg]:size-4"
        >
          <X aria-hidden />
        </button>
      )}
    </div>
  )
}
