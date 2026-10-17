import { zodResolver } from '@hookform/resolvers/zod'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { hojeCivil } from '@/entities/calendario'
import { ocorrenciasQuery, TIPOS_OCORRENCIA, type TipoOcorrencia } from '@/entities/estudante'
import { i18n } from '@lingui/core'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { formatarDataCivil, formatarInstante } from '@/shared/lib/datas'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import {
  AreaTexto,
  Aviso,
  Button,
  Campo,
  ControloSegmentado,
  Esqueleto,
  EstadoVazio,
  EtiquetaEstado,
  Folha,
  notificar,
  SelectorData,
} from '@/shared/ui'
import { esquemaOcorrencia, TIPOS, type DadosOcorrencia } from '../model/esquema'
import { useRegistarOcorrencia } from '../model/use-registar-ocorrencia'

const TOM: Record<TipoOcorrencia, 'neutra' | 'accao' | 'aviso' | 'perigo'> = {
  PEDAGOGICA: 'accao',
  DISCIPLINAR: 'perigo',
  SAUDE: 'aviso',
  OUTRA: 'neutra',
}

interface Props {
  estudanteId: string
  nome: string
  podeRegistar: boolean
}

/** Ocorrências do estudante (guia 2.5): lista da mais recente para a mais antiga; registar em folha lateral. */
export function OcorrenciasEstudante({ estudanteId, nome, podeRegistar }: Props) {
  const { t } = useLingui()
  const { data: ocorrencias } = useQuery(ocorrenciasQuery(estudanteId))
  const [aRegistar, setARegistar] = useState(false)
  if (!ocorrencias) return <Esqueleto className="h-48 w-full" />

  return (
    <section aria-labelledby="ocorrencias-titulo" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="ocorrencias-titulo" className="text-titulo-seccao">
          <Trans>Ocorrências</Trans>
        </h2>
        {podeRegistar && (
          <Button data-atalho="novo" onClick={() => setARegistar(true)}>
            <Plus aria-hidden className="size-4 stroke-[1.5]" />
            <Trans>Registar ocorrência</Trans>
          </Button>
        )}
      </div>
      {ocorrencias.length === 0 ? (
        <EstadoVazio
          titulo={t`Sem ocorrências registadas.`}
          descricao={t`Faltas a provas, questões de saúde ou de disciplina ficam aqui, com data.`}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-linha rounded-cartao bg-superficie ring-1 ring-linha">
          {ocorrencias.map((o) => {
            const autor = o.autor
            return (
              <li key={o.id} className="flex flex-col gap-1.5 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tabular font-medium">{formatarDataCivil(o.data)}</span>
                  <EtiquetaEstado tom={TOM[o.tipo]}>{o.tipoRotulo}</EtiquetaEstado>
                </div>
                <p>{o.descricao}</p>
                <p className="tabular text-secundario text-texto-3">
                  {t`Registada por ${autor}`} · {formatarInstante(o.registadaEm)}
                </p>
              </li>
            )
          })}
        </ul>
      )}
      <FolhaRegistar
        estudanteId={estudanteId}
        nome={nome}
        aberta={aRegistar}
        aoFechar={() => setARegistar(false)}
      />
    </section>
  )
}

function FolhaRegistar({
  estudanteId,
  nome,
  aberta,
  aoFechar,
}: {
  estudanteId: string
  nome: string
  aberta: boolean
  aoFechar: () => void
}) {
  const { t } = useLingui()
  const hoje = hojeCivil()
  const registar = useRegistarOcorrencia(estudanteId)
  const [erroGeral, setErroGeral] = useState<string>()
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<DadosOcorrencia>({
    resolver: zodResolver(esquemaOcorrencia(hoje)),
    mode: 'onTouched',
    defaultValues: { tipo: 'PEDAGOGICA', data: hoje, descricao: '' },
  })

  function fechar() {
    reset()
    setErroGeral(undefined)
    aoFechar()
  }

  async function gravar(dados: DadosOcorrencia) {
    setErroGeral(undefined)
    try {
      await registar.mutateAsync(dados)
      notificar.sucesso(t`Ocorrência registada.`)
      anunciar.educado(t`Ocorrência registada.`)
      fechar()
    } catch (erro) {
      const deCampo = eApiError(erro) ? erro.errors : []
      for (const e of deCampo) {
        if (e.campo === 'descricao' || e.campo === 'data' || e.campo === 'tipo') {
          setError(e.campo, { message: e.mensagem })
        }
      }
      if (!deCampo.length) setErroGeral(mensagemDeErro(erro))
    }
  }

  return (
    <Folha
      aberta={aberta}
      aoMudar={(v) => !v && fechar()}
      pendente={registar.isPending}
      titulo={t`Registar ocorrência`}
      descricao={nome}
      rodape={
        <>
          <Button onClick={fechar} disabled={registar.isPending}>
            <Trans>Cancelar</Trans>
          </Button>
          <Button
            variante="primario"
            type="submit"
            form="form-ocorrencia"
            aCarregar={registar.isPending}
          >
            <Trans>Registar</Trans>
          </Button>
        </>
      }
    >
      <form
        id="form-ocorrencia"
        noValidate
        onSubmit={(e) => void handleSubmit(gravar)(e)}
        className="flex flex-col gap-4"
      >
        {erroGeral && <Aviso tom="erro">{erroGeral}</Aviso>}
        <Controller
          control={control}
          name="tipo"
          render={({ field }) => (
            <div className="flex flex-col gap-1.5">
              <span className="text-legenda text-texto-2">
                <Trans>Tipo</Trans>
              </span>
              <ControloSegmentado
                rotulo={t`Tipo de ocorrência`}
                valor={field.value}
                aoMudar={(v) => field.onChange(v)}
                opcoes={TIPOS.map((tipo) => ({
                  valor: tipo,
                  rotulo: i18n._(TIPOS_OCORRENCIA[tipo]),
                }))}
              />
            </div>
          )}
        />
        <Controller
          control={control}
          name="data"
          render={({ field }) => (
            <SelectorData
              rotulo={t`Data`}
              valor={field.value}
              aoMudar={(v) => field.onChange(v ?? '')}
              maximo={hoje}
              erro={errors.data?.message}
              obrigatorio
            />
          )}
        />
        <Campo rotulo={t`O que aconteceu`} erro={errors.descricao?.message} obrigatorio>
          {(c) => <AreaTexto {...c} rows={4} {...register('descricao')} />}
        </Campo>
      </form>
    </Folha>
  )
}
