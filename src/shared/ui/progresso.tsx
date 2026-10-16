import { useLingui } from '@lingui/react/macro'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

type Estado = 'indeterminado' | 'determinado' | 'concluido' | 'falhado'

interface PropsBarra {
  rotulo: string
  /** 0–100; ignorado quando indeterminado */
  valor?: number
  estado?: Estado
  className?: string
}

/** Barra de progresso (guia 6.2): indeterminado, determinado, concluído, falhado. */
export function BarraProgresso({
  rotulo,
  valor = 0,
  estado = 'determinado',
  className,
}: PropsBarra) {
  const indeterminado = estado === 'indeterminado'
  const largura = estado === 'concluido' ? 100 : Math.max(0, Math.min(100, valor))
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminado ? undefined : largura}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-linha', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-(--duracao-padrao) ease-padrao',
          estado === 'falhado' ? 'bg-perigo' : estado === 'concluido' ? 'bg-sucesso' : 'bg-acento',
          indeterminado && 'absolute w-1/3 animate-indeterminado',
        )}
        style={indeterminado ? undefined : { width: `${largura}%` }}
      />
    </div>
  )
}

/** Indicador pontual: só para acções pontuais; para conteúdo usam-se esqueletos (guia 5.6). */
export function IndicadorPontual({ rotulo, className }: { rotulo?: string; className?: string }) {
  const { t } = useLingui()
  return (
    <span role="status" className={cn('inline-flex items-center text-texto-3', className)}>
      <LoaderCircle aria-hidden className="size-4 animate-spin stroke-[1.5]" />
      <span className="sr-only">{rotulo ?? t`A carregar`}</span>
    </span>
  )
}
