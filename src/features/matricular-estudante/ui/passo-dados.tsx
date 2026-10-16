import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { duplicadosQuery } from '@/entities/estudante'
import { TEMPOS } from '@/shared/config/constantes'
import { formatarDataCivil } from '@/shared/lib/datas'
import {
  AreaTexto,
  Avatar,
  Aviso,
  Button,
  Campo,
  ControloSegmentado,
  Entrada,
  SelectorData,
} from '@/shared/ui'
import type { DadosMatricula } from '../model/esquema'

/** Passo 1: dados pessoais, com verificação de duplicados enquanto se escreve (guia 2.3, 6.3). */
export function PassoDados({ anoInicio }: { anoInicio?: string }) {
  const { t } = useLingui()
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<DadosMatricula>()
  const nome = useWatch({ control, name: 'estudante.nome' })
  const dataNascimento = useWatch({ control, name: 'estudante.dataNascimento' })
  const duplicado = useWatch({ control, name: 'duplicado' })
  const e = errors.estudante

  // Espera um pouco depois de escrever antes de procurar (guia 5.6)
  const [nomeEstavel, setNomeEstavel] = useState(nome)
  useEffect(() => {
    const espera = setTimeout(() => setNomeEstavel(nome), TEMPOS.pesquisaEspera * 3)
    return () => clearTimeout(espera)
  }, [nome])
  const { data: candidatos = [] } = useQuery(
    duplicadosQuery(nomeEstavel, dataNascimento || undefined),
  )

  useEffect(() => {
    setValue('duplicado.candidatos', candidatos.length)
  }, [candidatos.length, setValue])

  return (
    <div className="flex flex-col gap-5">
      <Campo rotulo={t`Nome completo`} obrigatorio erro={e?.nome?.message}>
        {(c) => <Entrada {...c} autoComplete="off" {...register('estudante.nome')} />}
      </Campo>

      {candidatos.length > 0 && (
        <section
          aria-labelledby="duplicados-titulo"
          className="flex flex-col gap-3 rounded-cartao bg-superficie p-4 ring-1 ring-aviso/40"
        >
          <h3 id="duplicados-titulo" className="text-subtitulo">
            <Trans>Pode ser o mesmo estudante</Trans>
          </h3>
          <ul className="flex flex-col gap-2">
            {candidatos.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <Avatar nome={c.nome} fotografia={c.fotografiaUrl} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{c.nome}</span>
                  <span className="tabular text-secundario text-texto-2">
                    {c.numeroProcesso} · {formatarDataCivil(c.dataNascimento)} ·{' '}
                    {c.matricula ?? '—'}
                  </span>
                </div>
                <Button asChild tamanho="compacto">
                  <Link
                    to="/estudantes/$estudanteId"
                    params={{ estudanteId: c.id }}
                    search={{ separador: 'resumo' }}
                  >
                    <Trans>Abrir processo</Trans>
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-(--color-acento)"
              {...register('duplicado.ignorado')}
            />
            <Trans>Não é o mesmo estudante</Trans>
          </label>
          {errors.duplicado?.ignorado && !duplicado.ignorado && (
            <p className="text-secundario text-perigo">{errors.duplicado.ignorado.message}</p>
          )}
          {duplicado.ignorado && (
            <Campo
              rotulo={t`Porque não é o mesmo estudante?`}
              obrigatorio
              erro={errors.duplicado?.justificacao?.message}
            >
              {(c) => <AreaTexto {...c} {...register('duplicado.justificacao')} />}
            </Campo>
          )}
        </section>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Controller
          control={control}
          name="estudante.dataNascimento"
          render={({ field, fieldState }) => (
            <SelectorData
              rotulo={t`Data de nascimento`}
              obrigatorio
              valor={field.value || null}
              aoMudar={(v) => field.onChange(v ?? '')}
              maximo={anoInicio}
              erro={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="estudante.sexo"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5">
              <span className="text-legenda text-texto-2">
                <Trans>Sexo</Trans>
                <span aria-hidden className="ml-0.5 text-perigo">
                  *
                </span>
              </span>
              <ControloSegmentado
                rotulo={t`Sexo`}
                valor={field.value ?? ''}
                aoMudar={field.onChange}
                opcoes={[
                  { valor: 'F', rotulo: t`Feminino` },
                  { valor: 'M', rotulo: t`Masculino` },
                ]}
              />
              {fieldState.error && (
                <p className="text-secundario text-perigo">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
      </div>

      {/* Campos opcionais recolhidos (guia 1.1: divulgação progressiva) */}
      <details className="group rounded-cartao bg-superficie ring-1 ring-linha open:pb-4">
        <summary className="cursor-pointer list-none px-4 py-3 text-acento">
          <Trans>Mais dados (opcionais)</Trans>
        </summary>
        <div className="grid gap-5 px-4 sm:grid-cols-2">
          <Campo rotulo={t`Documento de identificação`} erro={e?.documentoIdentificacao?.message}>
            {(c) => (
              <Entrada
                {...c}
                className="tabular"
                {...register('estudante.documentoIdentificacao')}
              />
            )}
          </Campo>
          <Campo rotulo={t`Telefone`} erro={e?.telefone?.message}>
            {(c) => (
              <Entrada
                {...c}
                inputMode="tel"
                autoComplete="off"
                {...register('estudante.telefone')}
              />
            )}
          </Campo>
          <Campo rotulo={t`Naturalidade`}>
            {(c) => <Entrada {...c} {...register('estudante.naturalidade')} />}
          </Campo>
          <Campo rotulo={t`Morada`}>
            {(c) => <Entrada {...c} {...register('estudante.morada')} />}
          </Campo>
        </div>
      </details>

      {errors.root?.servidor && <Aviso tom="erro">{errors.root.servidor.message}</Aviso>}
    </div>
  )
}
