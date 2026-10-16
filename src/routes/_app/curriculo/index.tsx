import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Lock } from 'lucide-react'
import * as z from 'zod/mini'
import { classesQuery } from '@/entities/classe'
import { planoQuery, planosQuery, type PlanoResumo } from '@/entities/plano'
import { AccoesPlano, EditorPlano } from '@/features/editar-plano'
import { TEMPOS } from '@/shared/config/constantes'
import { formatarDataCivil } from '@/shared/lib/datas'
import { useCan } from '@/shared/lib/permissoes'
import { ControloSegmentado, ErroDeRota, Esqueleto, EstadoVazio, EtiquetaEstado } from '@/shared/ui'

// Classe e versão abertas vivem no URL: cada plano é uma ligação (guia 7.1)
const pesquisaCurriculo = z.object({
  classeId: z.catch(z._default(z.string(), 'c7'), 'c7'),
  plano: z.catch(z.optional(z.string()), undefined),
})

/** Sem versão pedida, abre o rascunho (o que se está a preparar) ou o vigente. */
const versaoPorOmissao = (versoes: PlanoResumo[]) =>
  versoes.find((v) => v.estado === 'RASCUNHO') ??
  versoes.find((v) => v.estado === 'VIGENTE') ??
  versoes[0]

export const Route = createFileRoute('/_app/curriculo/')({
  validateSearch: pesquisaCurriculo,
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps: { classeId, plano } }) => {
    const versoes = await queryClient.ensureQueryData(planosQuery(classeId))
    const id = plano ?? versaoPorOmissao(versoes)?.id
    if (id) await queryClient.ensureQueryData(planoQuery(id))
  },
  pendingComponent: () => <Esqueleto className="h-96 w-full" />,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  component: PlanoDaClasse,
})

/** Plano curricular da classe, com versões (guia 2.2): rascunho editável, vigente, arquivado. */
function PlanoDaClasse() {
  const { t } = useLingui()
  const { classeId, plano: pedido } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const podeEscrever = useCan('curriculo:escrever')
  const { data: classes = [] } = useQuery(classesQuery())
  const { data: versoes = [] } = useQuery(planosQuery(classeId))
  const id = pedido ?? versaoPorOmissao(versoes)?.id
  const { data: plano } = useQuery({ ...planoQuery(id ?? ''), enabled: Boolean(id) })
  const classe = classes.find((c) => c.id === classeId)
  const designacao = classe?.designacao ?? ''
  const ciclo = classe?.ciclo

  const abrir = (planoId: string) =>
    void navigate({ search: { classeId, plano: planoId }, replace: true })

  if (!versoes.length) {
    return (
      <EstadoVazio
        titulo={t`Esta classe ainda não tem plano curricular.`}
        descricao={t`O plano diz que disciplinas a classe tem e com que carga semanal.`}
      />
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-titulo-pagina">
            <Trans>Plano da {designacao}</Trans>
          </h1>
          <p className="text-secundario text-texto-2">{ciclo}</p>
        </div>
        {plano && podeEscrever && (
          <AccoesPlano plano={plano} versoes={versoes} classe={designacao} aoAbrir={abrir} />
        )}
      </div>

      <ControloSegmentado
        rotulo={t`Versões do plano`}
        valor={id ?? ''}
        aoMudar={abrir}
        opcoes={versoes.map((v) => {
          const n = v.versao
          const estado = v.estadoRotulo
          return { valor: v.id, rotulo: t`Versão ${n} · ${estado}` }
        })}
      />

      {!plano ? (
        <Esqueleto className="h-80 w-full" />
      ) : (
        <div className="flex flex-col gap-4">
          <EstadoDaVersao plano={plano} podeEscrever={podeEscrever} />
          <div className="rounded-cartao bg-superficie px-4 py-2 ring-1 ring-linha">
            <EditorPlano plano={plano} podeEditar={podeEscrever && plano.editavel} />
          </div>
        </div>
      )}
    </section>
  )
}

function EstadoDaVersao({ plano, podeEscrever }: { plano: PlanoResumo; podeEscrever: boolean }) {
  const { t } = useLingui()
  const data = plano.publicadoEm ? formatarDataCivil(plano.publicadoEm) : ''
  return (
    <div className="flex flex-wrap items-center gap-3 text-secundario text-texto-2">
      <EtiquetaEstado tom={plano.estadoTom}>{plano.estadoRotulo}</EtiquetaEstado>
      {plano.estado === 'RASCUNHO' && (
        <span>
          {podeEscrever
            ? t`Em preparação. Só esta versão se edita; as alterações guardam-se logo.`
            : t`Em preparação.`}
        </span>
      )}
      {plano.estado === 'VIGENTE' && <span>{t`Em vigor desde ${data}.`}</span>}
      {plano.estado === 'ARQUIVADO' && (
        <span className="flex items-center gap-1.5">
          <Lock aria-hidden className="size-3.5 stroke-[1.5] text-texto-3" />
          {t`Versão substituída, publicada em ${data}. Fica para consulta e para o histórico.`}
        </span>
      )}
    </div>
  )
}
