import { cn } from '@/shared/lib/cn'
import type { Turma } from '../model/tipos'

/** Barra de ocupação (inscritos de lotação). Cor só reforça; o texto diz sempre o estado. */
export function BarraOcupacao({
  turma,
}: {
  turma: Pick<Turma, 'inscritos' | 'lotacaoMaxima' | 'ocupacao' | 'turmaCheia'>
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        role="meter"
        aria-label="Ocupação da turma"
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
        {turma.inscritos} de {turma.lotacaoMaxima}
        {turma.turmaCheia && <span className="ml-1 text-perigo">· cheia</span>}
      </span>
    </div>
  )
}
