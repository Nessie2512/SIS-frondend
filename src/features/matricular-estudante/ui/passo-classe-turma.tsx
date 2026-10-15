import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { classesQuery } from '@/entities/classe'
import { BarraOcupacao, turmasQuery } from '@/entities/turma'
import { cn } from '@/shared/lib/cn'
import { Campo, EtiquetaEstado, Esqueleto, Selector } from '@/shared/ui'
import type { DadosMatricula } from '../model/esquema'

/** Passo 4: classe e turma. Sugere a turma com mais vagas; turmas cheias ficam desactivadas com a razão (guia 2.3). */
export function PassoClasseTurma({ anoLectivoId }: { anoLectivoId: string }) {
  const { t } = useLingui()
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<DadosMatricula>()
  const classeId = useWatch({ control, name: 'classeId' })
  const turmaId = useWatch({ control, name: 'turmaId' })
  const { data: classes = [] } = useQuery(classesQuery())
  const { data: pagina, isLoading } = useQuery({
    ...turmasQuery({ anoLectivoId, classeId, estado: 'ACTIVA', page: 1 }),
    enabled: Boolean(classeId),
  })
  const turmas = useMemo(() => pagina?.turmas ?? [], [pagina])
  const sugerida = [...turmas].filter((x) => !x.turmaCheia).sort((a, b) => b.vagas - a.vagas)[0]

  // Ao escolher a classe, propõe logo a turma sugerida (o secretário pode mudar)
  useEffect(() => {
    if (sugerida && turmaId === null && classeId) setValue('turmaId', sugerida.id)
    if (turmaId && turmas.length && !turmas.some((x) => x.id === turmaId)) setValue('turmaId', null)
  }, [sugerida, turmaId, classeId, turmas, setValue])

  return (
    <div className="flex flex-col gap-5">
      <Controller
        control={control}
        name="classeId"
        render={({ field, fieldState }) => (
          <Campo
            rotulo={t`Classe`}
            obrigatorio
            erro={fieldState.error?.message}
            className="max-w-xs"
          >
            {(c) => (
              <Selector
                {...c}
                opcoes={classes.map((x) => ({
                  valor: x.id,
                  rotulo: x.designacao,
                  descricao: x.ciclo,
                }))}
                valor={field.value || null}
                aoMudar={(v) => {
                  field.onChange(v ?? '')
                  setValue('turmaId', null)
                }}
              />
            )}
          </Campo>
        )}
      />

      {classeId && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-legenda text-texto-2">
            <Trans>Turma</Trans>
          </legend>
          {isLoading ? (
            <Esqueleto className="h-32 w-full" />
          ) : (
            <div className="flex flex-col gap-2">
              {turmas.map((turma) => (
                <label
                  key={turma.id}
                  className={cn(
                    'flex items-center gap-4 rounded-cartao bg-superficie px-4 py-3 ring-1 ring-linha',
                    turma.turmaCheia
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer has-checked:ring-2 has-checked:ring-acento',
                  )}
                >
                  <input
                    type="radio"
                    name="turma"
                    value={turma.id}
                    checked={turmaId === turma.id}
                    disabled={turma.turmaCheia}
                    onChange={() => setValue('turmaId', turma.id, { shouldDirty: true })}
                    className="size-4 accent-(--color-acento)"
                  />
                  <span className="flex flex-1 flex-col">
                    <span className="flex items-center gap-2 font-medium">
                      {turma.designacao}
                      {turma.id === sugerida?.id && (
                        <EtiquetaEstado tom="accao">{t`Sugerida`}</EtiquetaEstado>
                      )}
                    </span>
                    <span className="text-secundario text-texto-2">
                      {turma.turnoRotulo} · {turma.sala ?? '—'}
                      {turma.turmaCheia && (
                        <> · {t`Turma cheia: escolha outra ou peça uma excepção depois.`}</>
                      )}
                    </span>
                  </span>
                  <BarraOcupacao turma={turma} />
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-4 rounded-cartao px-4 py-3 ring-1 ring-linha has-checked:ring-2 has-checked:ring-acento">
                <input
                  type="radio"
                  name="turma"
                  checked={turmaId === null}
                  onChange={() => setValue('turmaId', null, { shouldDirty: true })}
                  className="size-4 accent-(--color-acento)"
                />
                <span className="flex flex-col">
                  <span className="font-medium">
                    <Trans>Inscrever na turma mais tarde</Trans>
                  </span>
                  <span className="text-secundario text-texto-2">
                    <Trans>Fica na lista de estudantes sem turma, no quadro da distribuição.</Trans>
                  </span>
                </span>
              </label>
            </div>
          )}
          {errors.turmaId && (
            <p className="text-secundario text-perigo">{errors.turmaId.message}</p>
          )}
        </fieldset>
      )}
    </div>
  )
}
