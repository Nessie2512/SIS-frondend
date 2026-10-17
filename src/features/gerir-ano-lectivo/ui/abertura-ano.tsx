import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { Link, type LinkProps } from '@tanstack/react-router'
import { Circle, CircleCheck, CircleDashed, CircleSlash } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  aberturaQuery,
  useContextoAno,
  type Abertura,
  type AnoLectivo,
} from '@/entities/ano-lectivo'
import { anunciar } from '@/shared/lib/anunciar'
import { cn } from '@/shared/lib/cn'
import { mensagemDeErro } from '@/shared/lib/erros-dominio'
import { Button, Dialogo, Esqueleto, notificar } from '@/shared/ui'
import { useActivarAno, useDuplicarTurmas } from '../model/use-accoes-ano'

type Etapa = Abertura['etapas'][number]

/**
 * Abertura do ano (guia 2.3): a sequência como lista de etapas com estado. Cada etapa abre o
 * ecrã certo, já no contexto do ano que se está a preparar.
 */
export function AberturaAno({ ano, podeGerir }: { ano: AnoLectivo; podeGerir: boolean }) {
  const { t } = useLingui()
  const { data: abertura } = useQuery(aberturaQuery(ano.id))
  if (!abertura) return <Esqueleto className="h-96 w-full" />
  const feitas = abertura.etapas.filter((e) => e.estado === 'FEITA').length
  const total = abertura.etapas.filter((e) => e.estado !== 'OPCIONAL').length

  return (
    <section aria-labelledby="abertura-titulo" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="abertura-titulo" className="text-titulo-seccao">
          <Trans>Abertura do ano</Trans>
        </h2>
        <p className="tabular text-secundario text-texto-2">
          {t`${feitas} de ${total} etapas feitas`}
        </p>
      </div>
      <ol
        aria-label={t`Etapas da abertura`}
        className="flex flex-col divide-y divide-linha rounded-cartao bg-superficie ring-1 ring-linha"
      >
        {abertura.etapas.map((etapa, i) => (
          <LinhaEtapa
            key={etapa.id}
            numero={i + 1}
            etapa={etapa}
            ano={ano}
            anoEmCurso={abertura.anoEmCurso}
            podeGerir={podeGerir}
          />
        ))}
      </ol>
    </section>
  )
}

function LinhaEtapa({
  numero,
  etapa,
  ano,
  anoEmCurso,
  podeGerir,
}: {
  numero: number
  etapa: Etapa
  ano: AnoLectivo
  anoEmCurso: string | null
  podeGerir: boolean
}) {
  const { t } = useLingui()
  const n = etapa.quantidade ?? 0
  const emCurso = anoEmCurso ?? ''

  const TITULO: Record<Etapa['id'], string> = {
    CRIAR: t`Criar o ano lectivo`,
    CALENDARIO: t`Rever trimestres e calendário`,
    TURMAS: t`Preparar as turmas`,
    RENOVACAO: t`Renovar as matrículas`,
    MATRICULAS: t`Matrículas novas e transferências`,
    DISTRIBUICAO: t`Distribuir os estudantes pelas turmas`,
    DOCENTES: t`Atribuir docentes`,
    ACTIVAR: t`Activar o ano lectivo`,
  }
  const DETALHE: Record<Etapa['id'], string> = {
    CRIAR: t`Datas e designação definidas.`,
    CALENDARIO: t`${n} trimestres gerados. Reveja feriados e datas-chave.`,
    TURMAS: n ? t`${n} turmas preparadas.` : t`Duplique a estrutura do ano em curso.`,
    RENOVACAO: t`Simule, reveja os excluídos e confirme.`,
    MATRICULAS: t`${n} matrículas neste ano. Etapa sem fim marcado.`,
    DISTRIBUICAO:
      etapa.quantidade === null
        ? t`Ainda não há matrículas neste ano.`
        : n
          ? t`${n} matrículas sem turma.`
          : t`Todas as matrículas têm turma.`,
    DOCENTES:
      etapa.quantidade === null
        ? t`Prepare primeiro as turmas.`
        : n
          ? t`${n} disciplinas sem docente.`
          : t`Todas as disciplinas têm docente.`,
    ACTIVAR:
      etapa.estado === 'BLOQUEADA'
        ? t`Encerre primeiro o ano ${emCurso}: só pode haver um em curso.`
        : t`O ano passa a ser o ano em curso.`,
  }
  const ESTADO: Record<Etapa['estado'], { rotulo: string; icone: ReactNode }> = {
    FEITA: { rotulo: t`Feita`, icone: <CircleCheck className="text-sucesso" /> },
    POR_FAZER: { rotulo: t`Por fazer`, icone: <Circle className="text-texto-3" /> },
    OPCIONAL: { rotulo: t`Contínua`, icone: <CircleDashed className="text-texto-3" /> },
    BLOQUEADA: { rotulo: t`Bloqueada`, icone: <CircleSlash className="text-aviso" /> },
  }
  const estado = ESTADO[etapa.estado]
  const titulo = TITULO[etapa.id]

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span aria-hidden className="flex [&_svg]:size-5 [&_svg]:stroke-[1.5]">
        {estado.icone}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn('font-medium', etapa.estado === 'FEITA' && 'text-texto-2')}>
          <span className="tabular">{numero}.</span> {titulo}
          <span className="sr-only">: {estado.rotulo}</span>
        </span>
        <span className="text-secundario text-texto-2">{DETALHE[etapa.id]}</span>
      </div>
      <AccaoEtapa etapa={etapa} ano={ano} podeGerir={podeGerir} titulo={titulo} />
    </li>
  )
}

/** Ligação que muda primeiro o ano em contexto, para o ecrã abrir já no ano em preparação. */
function LigacaoNoAno({
  ano,
  children,
  rotulo,
  ...ligacao
}: LinkProps & { ano: AnoLectivo; children: ReactNode; rotulo: string }) {
  const escolher = useContextoAno((e) => e.escolher)
  return (
    <Link
      {...ligacao}
      aria-label={rotulo}
      onClick={() => escolher(ano.id)}
      className="text-secundario whitespace-nowrap text-acento hover:underline"
    >
      {children}
    </Link>
  )
}

function AccaoEtapa({
  etapa,
  ano,
  podeGerir,
  titulo,
}: {
  etapa: Etapa
  ano: AnoLectivo
  podeGerir: boolean
  titulo: string
}) {
  const { t } = useLingui()
  const rotulo = t`Abrir: ${titulo}`
  switch (etapa.id) {
    case 'CALENDARIO':
      return (
        <LigacaoNoAno ano={ano} to="/calendario" rotulo={rotulo}>
          <Trans>Abrir</Trans>
        </LigacaoNoAno>
      )
    case 'TURMAS':
      return etapa.estado === 'FEITA' ? (
        <LigacaoNoAno ano={ano} to="/turmas" rotulo={rotulo}>
          <Trans>Abrir</Trans>
        </LigacaoNoAno>
      ) : podeGerir ? (
        <BotaoDuplicarTurmas ano={ano} />
      ) : null
    case 'RENOVACAO':
      return etapa.estado === 'FEITA' ? null : (
        <LigacaoNoAno ano={ano} to="/matriculas/renovar" rotulo={rotulo}>
          <Trans>Abrir</Trans>
        </LigacaoNoAno>
      )
    case 'MATRICULAS':
      return (
        <LigacaoNoAno ano={ano} to="/matriculas/nova" rotulo={rotulo}>
          <Trans>Abrir</Trans>
        </LigacaoNoAno>
      )
    case 'DISTRIBUICAO':
      return (
        <LigacaoNoAno ano={ano} to="/turmas/quadro" rotulo={rotulo}>
          <Trans>Abrir</Trans>
        </LigacaoNoAno>
      )
    case 'DOCENTES':
      return (
        <LigacaoNoAno ano={ano} to="/turmas" rotulo={rotulo}>
          <Trans>Abrir</Trans>
        </LigacaoNoAno>
      )
    case 'ACTIVAR':
      return podeGerir && etapa.estado === 'POR_FAZER' ? <BotaoActivar ano={ano} /> : null
    default:
      return null
  }
}

function BotaoDuplicarTurmas({ ano }: { ano: AnoLectivo }) {
  const { t } = useLingui()
  const duplicar = useDuplicarTurmas(ano.id)
  return (
    <Button
      tamanho="compacto"
      aCarregar={duplicar.isPending}
      onClick={() =>
        duplicar.mutate(undefined, {
          onSuccess: ({ criadas, origem }) => {
            const mensagem = t`${criadas} turmas criadas a partir de ${origem}.`
            notificar.sucesso(mensagem)
            anunciar.educado(mensagem)
          },
          onError: (e) => notificar.erro(mensagemDeErro(e)),
        })
      }
    >
      <Trans>Duplicar as turmas</Trans>
    </Button>
  )
}

/** Activar avisa do efeito (guia 2.4): o ano passa a ser o ano em curso e o contexto de todos. */
function BotaoActivar({ ano }: { ano: AnoLectivo }) {
  const { t } = useLingui()
  const activar = useActivarAno(ano.id)
  const [aberto, setAberto] = useState(false)
  const designacao = ano.designacao
  return (
    <>
      <Button tamanho="compacto" variante="primario" onClick={() => setAberto(true)}>
        <Trans>Activar</Trans>
      </Button>
      <Dialogo
        aberta={aberto}
        aoMudar={setAberto}
        pendente={activar.isPending}
        titulo={t`Activar o ano ${designacao}`}
        descricao={t`Passa a ser o ano em curso: o ano que todos vêem por omissão no cabeçalho.`}
        rodape={
          <>
            <Button onClick={() => setAberto(false)} disabled={activar.isPending}>
              <Trans>Cancelar</Trans>
            </Button>
            <Button
              variante="primario"
              aCarregar={activar.isPending}
              onClick={() =>
                activar.mutate(undefined, {
                  onSuccess: () => {
                    setAberto(false)
                    notificar.sucesso(t`O ano ${designacao} está em curso.`)
                  },
                  onError: (e) => notificar.erro(mensagemDeErro(e)),
                })
              }
            >
              <Trans>Activar {designacao}</Trans>
            </Button>
          </>
        }
      />
    </>
  )
}
