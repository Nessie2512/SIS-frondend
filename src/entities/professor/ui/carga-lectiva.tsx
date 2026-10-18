import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { cn } from '@/shared/lib/cn'
import type { ProfessorResumo } from '../model/tipos'

/** Carga lectiva semanal (horas atribuídas de horas máximas). O texto diz sempre o valor. */
export function CargaLectiva({
  professor,
  className,
}: {
  professor: Pick<ProfessorResumo, 'cargaLectiva' | 'cargaMaxima' | 'ocupacao'>
  className?: string
}) {
  const { t } = useLingui()
  const { cargaLectiva, cargaMaxima } = professor
  const completa = cargaLectiva >= cargaMaxima
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        role="meter"
        aria-label={t`Carga lectiva`}
        aria-valuemin={0}
        aria-valuemax={cargaMaxima}
        aria-valuenow={cargaLectiva}
        aria-valuetext={plural(cargaMaxima, {
          one: `${cargaLectiva} de # hora semanal`,
          other: `${cargaLectiva} de # horas semanais`,
        })}
        className="h-1.5 w-20 overflow-hidden rounded-full bg-linha"
      >
        <div
          className={cn('h-full rounded-full', completa ? 'bg-aviso' : 'bg-acento')}
          style={{ width: `${professor.ocupacao * 100}%` }}
        />
      </div>
      <span className="tabular text-secundario whitespace-nowrap text-texto-2">
        <Trans>
          {cargaLectiva} de {cargaMaxima} h
        </Trans>
      </span>
    </div>
  )
}
