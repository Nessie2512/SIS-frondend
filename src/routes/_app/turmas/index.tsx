import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
// zod/mini nas rotas: os esquemas de pesquisa vão no JavaScript inicial e o mini pesa uma fracção
import * as z from 'zod/mini'
import {
  BarraOcupacao,
  turmaQuery,
  turmasQuery,
  type FiltrosTurma,
  type Turma,
} from '@/entities/turma'
import { TEMPOS } from '@/shared/config/constantes'
import { cn } from '@/shared/lib/cn'
import {
  Button,
  colunasDe,
  ControloSegmentado,
  Esqueleto,
  EstadoVazio,
  ErroDeRota,
  EtiquetaEstado,
  Folha,
  TabelaDados,
  type ColunaTabela,
} from '@/shared/ui'

// Filtros, página e turma aberta vivem no URL; valores inválidos regressam ao padrão (guia 4.6, 7.1)
const pesquisaTurmas = z.object({
  classeId: z.catch(z.optional(z.string()), undefined),
  turno: z.catch(z.optional(z.enum(['MANHA', 'TARDE', 'NOITE'])), undefined),
  estado: z.catch(z._default(z.enum(['ACTIVA', 'ENCERRADA']), 'ACTIVA'), 'ACTIVA'),
  page: z.catch(z._default(z.int().check(z.minimum(1)), 1), 1),
  /** Turma aberta no painel lateral */
  turma: z.catch(z.optional(z.string()), undefined),
})

export const Route = createFileRoute('/_app/turmas/')({
  validateSearch: pesquisaTurmas,
  loaderDeps: ({ search: { turma: _, ...filtros } }) => filtros,
  loader: ({ context: { queryClient, anoLectivoId }, deps }) =>
    anoLectivoId ? queryClient.ensureQueryData(turmasQuery({ anoLectivoId, ...deps })) : null,
  pendingComponent: TurmasEsqueleto,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  component: EcraTurmas,
})

function EcraTurmas() {
  const { t } = useLingui()
  const { anoLectivoId } = Route.useRouteContext()
  if (!anoLectivoId) {
    return (
      <EstadoVazio
        titulo={t`Ainda não há anos lectivos.`}
        descricao={t`Crie o primeiro ano lectivo para começar.`}
      />
    )
  }
  return <ListaTurmas anoLectivoId={anoLectivoId} />
}

function useColunas(): ColunaTabela<Turma>[] {
  const { t } = useLingui()
  return useMemo(() => {
    const c = colunasDe<Turma>()
    return [
      c.accessor('designacao', {
        header: t`Turma`,
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      c.accessor('classe', {
        header: t`Classe`,
        cell: (info) => <span className="text-texto-2">{info.getValue()}</span>,
      }),
      c.accessor('turnoRotulo', {
        header: t`Turno`,
        cell: (info) => <span className="text-texto-2">{info.getValue()}</span>,
      }),
      c.accessor('sala', {
        header: t`Sala`,
        cell: (info) => <span className="text-texto-2">{info.getValue() ?? '—'}</span>,
      }),
      c.accessor('ocupacao', {
        header: t`Ocupação`,
        cell: (info) => <BarraOcupacao turma={info.row.original} />,
      }),
    ]
  }, [t])
}

function ListaTurmas({ anoLectivoId }: { anoLectivoId: string }) {
  const { t } = useLingui()
  const { turma: turmaAberta, ...search } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const filtros: FiltrosTurma = { anoLectivoId, ...search }
  const { data, isPlaceholderData, isError, refetch } = useQuery(turmasQuery(filtros))
  const colunas = useColunas()
  const pagina = data?.page ?? search.page
  const totalPaginas = data?.totalPaginas ?? 1

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-titulo-pagina">
          <Trans>Turmas</Trans>
        </h1>
        <ControloSegmentado
          rotulo={t`Estado das turmas`}
          valor={search.estado}
          aoMudar={(estado) =>
            void navigate({
              search: (s) => ({ ...s, estado: estado as 'ACTIVA' | 'ENCERRADA', page: 1 }),
            })
          }
          opcoes={[
            { valor: 'ACTIVA', rotulo: t`Activas` },
            { valor: 'ENCERRADA', rotulo: t`Encerradas` },
          ]}
        />
      </div>

      <div
        className={cn(
          'transition-opacity duration-(--duracao-padrao)',
          isPlaceholderData && 'opacity-60',
        )}
      >
        <TabelaDados
          rotulo={t`Turmas`}
          colunas={colunas}
          dados={data?.turmas}
          idDaLinha={(turma) => turma.id}
          aCarregar={!data}
          erro={isError && !data}
          aoTentarDeNovo={() => void refetch()}
          idActiva={turmaAberta}
          aoAbrir={(turma) => void navigate({ search: (s) => ({ ...s, turma: turma.id }) })}
          vazio={
            <EstadoVazio
              titulo={t`Ainda não há turmas neste ano.`}
              descricao={t`Crie a primeira ou duplique as do ano anterior.`}
            />
          }
        />
      </div>

      {totalPaginas > 1 && (
        <nav
          aria-label={t`Paginação`}
          className="flex items-center justify-end gap-3 text-secundario"
        >
          <span className="tabular text-texto-2">
            <Trans>
              Página {pagina} de {totalPaginas}
            </Trans>
          </span>
          <Button
            tamanho="compacto"
            disabled={search.page <= 1}
            onClick={() => void navigate({ search: (s) => ({ ...s, page: s.page - 1 }) })}
          >
            <Trans>Anterior</Trans>
          </Button>
          <Button
            tamanho="compacto"
            disabled={search.page >= totalPaginas}
            onClick={() => void navigate({ search: (s) => ({ ...s, page: s.page + 1 }) })}
          >
            <Trans>Seguinte</Trans>
          </Button>
        </nav>
      )}

      <PainelTurma
        id={turmaAberta}
        aoFechar={() => void navigate({ search: (s) => ({ ...s, turma: undefined }) })}
      />
    </section>
  )
}

/** Painel lateral de resumo (guia 6.3): abre a partir da linha; o URL regista a turma aberta; Esc fecha. */
function PainelTurma({ id, aoFechar }: { id: string | undefined; aoFechar: () => void }) {
  const { t } = useLingui()
  const { data: turma } = useQuery({ ...turmaQuery(id ?? ''), enabled: Boolean(id) })
  const titulo = turma?.designacao ?? t`Turma`

  return (
    <Folha
      aberta={Boolean(id)}
      aoMudar={(aberta) => !aberta && aoFechar()}
      titulo={titulo}
      descricao={turma?.classe}
    >
      {turma ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-corpo">
          <dt className="text-texto-2">
            <Trans>Estado</Trans>
          </dt>
          <dd>
            {turma.encerrada ? (
              <EtiquetaEstado tom="neutra">{t`Encerrada`}</EtiquetaEstado>
            ) : (
              <EtiquetaEstado tom="sucesso">{t`Activa`}</EtiquetaEstado>
            )}
          </dd>
          <dt className="text-texto-2">
            <Trans>Turno</Trans>
          </dt>
          <dd>{turma.turnoRotulo}</dd>
          <dt className="text-texto-2">
            <Trans>Sala</Trans>
          </dt>
          <dd>{turma.sala ?? '—'}</dd>
          <dt className="text-texto-2">
            <Trans>Ocupação</Trans>
          </dt>
          <dd>
            <BarraOcupacao turma={turma} />
          </dd>
        </dl>
      ) : (
        <div className="flex flex-col gap-3" aria-hidden>
          <Esqueleto className="h-5 w-40" />
          <Esqueleto className="h-5 w-32" />
          <Esqueleto className="h-5 w-48" />
        </div>
      )}
    </Folha>
  )
}

function TurmasEsqueleto() {
  const { t } = useLingui()
  return (
    <section className="flex flex-col gap-6" aria-busy="true" aria-label={t`A carregar turmas`}>
      <Esqueleto className="h-[34px] w-40" />
      <div className="rounded-cartao bg-superficie ring-1 ring-linha">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="flex h-linha items-center gap-6 border-b border-linha px-4 last:border-0"
          >
            <Esqueleto className="h-4 w-16" />
            <Esqueleto className="h-4 w-24" />
            <Esqueleto className="h-4 w-14" />
          </div>
        ))}
      </div>
    </section>
  )
}
