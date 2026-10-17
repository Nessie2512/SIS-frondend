import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { classesQuery } from '@/entities/classe'
import { BarraOcupacao, turmasQuery } from '@/entities/turma'
import { cn } from '@/shared/lib/cn'
import { Campo, Entrada, EtiquetaEstado, Esqueleto, Selector } from '@/shared/ui'
import type { DadosMatricula } from '../model/esquema'

/** Passo 4: classe e turma. Sugere a turma com mais vagas; turmas cheias ficam desactivadas com a razão (guia 2.3). */
export function PassoClasseTurma({ anoLectivoId }: { anoLectivoId: string }) {
  const { t } = useLingui()
  const {
    control,
    setValue,
    register,
    formState: { errors },
  } = useFormContext<DadosMatricula>()
  const classeId = useWatch({ control, name: 'classeId' })
  const transferida = useWatch({ control, name: 'transferencia.activa' })
  const turmaId = useWatch({ control, name: 'turmaId' })
  const { data: classes = [] } = useQuery(classesQuery())
  const ordemEscolhida = classes.find((c) => c.id === classeId)?.ordem ?? 0
  const anteriores = classes.filter((c) => c.ordem < ordemEscolhida)
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

      <fieldset className="flex flex-col gap-3 rounded-cartao bg-superficie p-4 ring-1 ring-linha">
        <legend className="sr-only">{t`Transferência de entrada`}</legend>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            {...register('transferencia.activa')}
            className="size-4 accent-(--color-acento)"
          />
          <span className="flex flex-col">
            <span className="font-medium">
              <Trans>Vem transferido de outra escola</Trans>
            </span>
            <span className="text-secundario text-texto-2">
              <Trans>A escola de origem e as classes lá concluídas entram no percurso.</Trans>
            </span>
          </span>
        </label>
        {transferida && (
          <>
            <Campo
              rotulo={t`Escola de origem`}
              erro={errors.transferencia?.escola?.message}
              obrigatorio
              className="max-w-md"
            >
              {(c) => <Entrada {...c} {...register('transferencia.escola')} />}
            </Campo>
            {anteriores.length > 0 && (
              <Controller
                control={control}
                name="transferencia.classesConcluidas"
                render={({ field }) => (
                  <fieldset className="flex flex-col gap-1.5">
                    <legend className="mb-1 text-legenda text-texto-2">
                      <Trans>Classes concluídas nessa escola</Trans>
                    </legend>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      {anteriores.map((c) => (
                        <label key={c.id} className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={field.value.includes(c.id)}
                            onChange={(e) =>
                              field.onChange(
                                e.target.checked
                                  ? [...field.value, c.id]
                                  : field.value.filter((x) => x !== c.id),
                              )
                            }
                            className="size-4 accent-(--color-acento)"
                          />
                          {c.designacao}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
              />
            )}
          </>
        )}
      </fieldset>

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
