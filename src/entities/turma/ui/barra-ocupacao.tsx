import { Trans, useLingui } from '@lingui/react/macro'
import { cn } from '@/shared/lib/cn'
import type { Turma } from '../model/tipos'

/** Barra de ocupação (inscritos de lotação). Cor só reforça; o texto diz sempre o estado. */
export function BarraOcupacao({
  turma,
}: {
  turma: Pick<Turma, 'inscritos' | 'lotacaoMaxima' | 'ocupacao' | 'turmaCheia'>
}) {
  const { t } = useLingui()
  const { inscritos, lotacaoMaxima } = turma
  // Backend SIS: ainda sem lotação nem inscritos por turma
  if (lotacaoMaxima === 0) {
    return (
      <span className="text-secundario text-texto-2">
        <Trans>Ocupação por publicar no servidor</Trans>
      </span>
    )
  }
  return (
    <div className="flex items-center gap-3">
      <div
        role="meter"
        aria-label={t`Ocupação da turma`}
        aria-valuemin={0}
        aria-valuemax={turma.lotacaoMaxima}
        aria-valuenow={turma.inscritos}
        className="h-1.5 w-24 overflow-hidden rounded-full bg-linha"
      >
        <div
          className={cn('h-full rounded-full', turma.turmaCheia ? 'bg-perigo' : 'bg-acento')}
          style={{ width: `${turma.ocupacao * 100}%` }}
        />
      </div>
      <span className="tabular text-secundario text-texto-2">
        <Trans>
          {inscritos} de {lotacaoMaxima}
        </Trans>
        {turma.turmaCheia && (
          <span className="ml-1 text-perigo">
            · <Trans>cheia</Trans>
          </span>
        )}
      </span>
    </div>
  )
}
