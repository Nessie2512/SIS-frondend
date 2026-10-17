import { zodResolver } from '@hookform/resolvers/zod'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { hojeCivil } from '@/entities/calendario'
import { professoresQuery } from '@/entities/professor'
import { docentesQuery, type DocenteTurma } from '@/entities/turma'
import { eApiError } from '@/shared/api'
import { anunciar } from '@/shared/lib/anunciar'
import { formatarDataCivil } from '@/shared/lib/datas'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import {
  Button,
  Campo,
  Entrada,
  Esqueleto,
  EstadoVazio,
  notificar,
  Selector,
  SelectorData,
} from '@/shared/ui'
import { esquemaAtribuicao, type DadosAtribuicao } from '../model/esquema'
import { useAtribuirDocente } from '../model/use-atribuir-docente'

interface Props {
  turmaId: string
  anoLectivoId: string
  /** Limites do ano lectivo, para a data da substituição */
  inicioAno: string
  fimAno: string
  podeAlterar: boolean
}

/**
 * Docentes da turma (guia 2.3, 2.4): uma linha por disciplina do plano vigente. Atribuir e
 * substituir no sítio; só aparecem professores activos e habilitados para a disciplina.
 */
export function DocentesTurma({ turmaId, anoLectivoId, inicioAno, fimAno, podeAlterar }: Props) {
  const { t } = useLingui()
  const { data: linhas } = useQuery(docentesQuery(turmaId))
  const [aEditar, setAEditar] = useState<string>()
  if (!linhas) return <Esqueleto className="h-40 w-full" />

  const semDocente = linhas.filter((l) => !l.actual).length
  return (
    <section aria-labelledby="docentes-titulo" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="docentes-titulo" className="text-subtitulo">
          <Trans>Docentes</Trans>
        </h3>
        {semDocente > 0 && (
          <span className="tabular text-secundario text-aviso">{t`${semDocente} sem docente`}</span>
        )}
      </div>
      {linhas.length === 0 ? (
        <EstadoVazio
          titulo={t`A classe ainda não tem plano curricular vigente.`}
          descricao={t`As disciplinas aparecem aqui quando o plano for publicado.`}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-linha rounded-cartao ring-1 ring-linha">
          {linhas.map((linha) => (
            <LinhaDocente
              key={linha.disciplinaId}
              linha={linha}
              turmaId={turmaId}
              anoLectivoId={anoLectivoId}
              inicioAno={inicioAno}
              fimAno={fimAno}
              podeAlterar={podeAlterar}
              aEditar={aEditar === linha.disciplinaId}
              aoEditar={(sim) => setAEditar(sim ? linha.disciplinaId : undefined)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function LinhaDocente({
  linha,
  turmaId,
  anoLectivoId,
  inicioAno,
  fimAno,
  podeAlterar,
  aEditar,
  aoEditar,
}: Omit<Props, 'turmaId'> & {
  turmaId: string
  linha: DocenteTurma
  aEditar: boolean
  aoEditar: (sim: boolean) => void
}) {
  const { t } = useLingui()
  const disciplina = linha.disciplina
  const horas = linha.horasSemanais
  const idHistorico = `historico-${linha.disciplinaId}`
  const [verHistorico, setVerHistorico] = useState(false)
  const nHistorico = linha.historico.length

  return (
    <li className="flex flex-col gap-2 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-secundario text-texto-2">
            {disciplina} · <span className="tabular">{t`${horas} h/semana`}</span>
          </span>
          {linha.actual ? (
            <span className="truncate font-medium">{linha.actual.professor}</span>
          ) : (
            <span className="text-aviso">
              <Trans>Sem docente</Trans>
            </span>
          )}
        </div>
        {nHistorico > 0 && (
          <Button
            variante="discreto"
            tamanho="icone"
            className="size-8 text-texto-2"
            aria-expanded={verHistorico}
            aria-controls={idHistorico}
            aria-label={t`Histórico de ${disciplina}`}
            onClick={() => setVerHistorico((v) => !v)}
          >
            <History aria-hidden className="size-4 stroke-[1.5]" />
          </Button>
        )}
        {podeAlterar && !aEditar && (
          <Button
            tamanho="compacto"
            aria-label={
              linha.actual
                ? t`Substituir o docente de ${disciplina}`
                : t`Atribuir docente a ${disciplina}`
            }
            onClick={() => aoEditar(true)}
          >
            {linha.actual ? <Trans>Substituir</Trans> : <Trans>Atribuir</Trans>}
          </Button>
        )}
      </div>
      {verHistorico && (
        <ul id={idHistorico} className="flex flex-col gap-1 text-secundario text-texto-2">
          {linha.historico.map((h) => {
            const nome = h.professor
            const de = formatarDataCivil(h.desde)
            const ate = formatarDataCivil(h.ate)
            return (
              <li key={`${h.professor}-${h.desde}`}>
                <span className="text-texto-1">{nome}</span> ·{' '}
                <span className="tabular">{t`de ${de} a ${ate}`}</span>
                {h.motivo && <> · {h.motivo}</>}
              </li>
            )
          })}
        </ul>
      )}
      {aEditar && (
        <FormAtribuir
          linha={linha}
          turmaId={turmaId}
          anoLectivoId={anoLectivoId}
          inicioAno={inicioAno}
          fimAno={fimAno}
          aoFechar={() => aoEditar(false)}
        />
      )}
    </li>
  )
}

function FormAtribuir({
  linha,
  turmaId,
  anoLectivoId,
  inicioAno,
  fimAno,
  aoFechar,
}: {
  linha: DocenteTurma
  turmaId: string
  anoLectivoId: string
  inicioAno: string
  fimAno: string
  aoFechar: () => void
}) {
  const { t } = useLingui()
  const atribuir = useAtribuirDocente(turmaId)
  const substituicao = Boolean(linha.actual)
  const minimo = linha.actual && linha.actual.desde > inicioAno ? linha.actual.desde : inicioAno
  const hoje = hojeCivil()
  const sugerida = hoje < minimo ? minimo : hoje > fimAno ? fimAno : hoje
  // Só professores activos e habilitados para a disciplina (guia 2.4)
  const { data: candidatos } = useQuery(
    professoresQuery({
      anoLectivoId,
      disciplinaId: linha.disciplinaId,
      estado: 'ACTIVO',
      page: 1,
    }),
  )
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DadosAtribuicao>({
    resolver: zodResolver(esquemaAtribuicao(substituicao, minimo, fimAno)),
    defaultValues: { professorId: '', desde: substituicao ? sugerida : '', motivo: '' },
  })
  const disciplina = linha.disciplina
  const horas = linha.horasSemanais

  const opcoes = (candidatos?.professores ?? [])
    .filter((p) => p.id !== linha.actual?.professorId)
    .map((p) => {
      const carga = p.cargaLectiva
      const maximo = p.cargaMaxima
      const cabe = carga + horas <= maximo
      return {
        valor: p.id,
        rotulo: p.nome,
        descricao: cabe
          ? t`${carga} de ${maximo} h atribuídas`
          : t`Sem horas livres: ${carga} de ${maximo} h`,
        desactivada: !cabe,
      }
    })

  function gravar(dados: DadosAtribuicao) {
    const professor = opcoes.find((o) => o.valor === dados.professorId)?.rotulo ?? ''
    const desde = substituicao ? dados.desde : sugerida
    atribuir.mutate(
      {
        disciplinaId: linha.disciplinaId,
        professorId: dados.professorId,
        professor,
        desde,
        motivo: substituicao ? dados.motivo.trim() : undefined,
      },
      {
        onSuccess: () => anunciar.educado(t`${disciplina}: ${professor}.`),
        onError: (erro) => {
          const doCampo = eApiError(erro) ? erro.errors[0]?.mensagem : undefined
          notificar.erro(`${disciplina}: ${doCampo ?? mensagemDeErro(erro)}`)
        },
      },
    )
    // Optimista: o nome já está na linha; o formulário fecha
    aoFechar()
  }

  return (
    <form
      noValidate
      aria-label={
        substituicao
          ? t`Substituir o docente de ${disciplina}`
          : t`Atribuir docente a ${disciplina}`
      }
      onSubmit={(e) => void handleSubmit(gravar)(e)}
      className="flex flex-col gap-3 rounded-controlo bg-fundo p-3"
    >
      <Controller
        control={control}
        name="professorId"
        render={({ field }) => (
          <Campo
            rotulo={substituicao ? t`Novo docente` : t`Docente`}
            erro={errors.professorId?.message}
            descricao={t`Só professores activos e habilitados para ${disciplina}.`}
            obrigatorio
          >
            {(c) => (
              <Selector
                {...c}
                placeholder={candidatos ? t`Escolher` : t`A carregar…`}
                opcoes={opcoes}
                valor={field.value || null}
                aoMudar={(v) => field.onChange(v ?? '')}
              />
            )}
          </Campo>
        )}
      />
      {substituicao && (
        <>
          <Controller
            control={control}
            name="desde"
            render={({ field }) => (
              <SelectorData
                rotulo={t`A partir de`}
                valor={field.value}
                aoMudar={(v) => field.onChange(v ?? '')}
                minimo={minimo}
                maximo={fimAno}
                erro={errors.desde?.message}
                descricao={t`A atribuição actual termina nesta data.`}
                obrigatorio
              />
            )}
          />
          <Campo rotulo={t`Motivo`} erro={errors.motivo?.message} obrigatorio>
            {(c) => (
              <Entrada
                {...c}
                {...register('motivo')}
                placeholder={t`Ex.: licença de maternidade`}
              />
            )}
          </Campo>
        </>
      )}
      <div className="flex justify-end gap-2">
        <Button tamanho="compacto" onClick={aoFechar}>
          <Trans>Cancelar</Trans>
        </Button>
        <Button tamanho="compacto" variante="primario" type="submit">
          {substituicao ? <Trans>Substituir</Trans> : <Trans>Atribuir</Trans>}
        </Button>
      </div>
    </form>
  )
}
