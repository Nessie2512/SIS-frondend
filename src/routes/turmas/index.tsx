import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { BarraOcupacao, turmasQuery, type FiltrosTurma } from '@/entities/turma'
import { TEMPOS } from '@/shared/config/constantes'
import { cn } from '@/shared/lib/cn'
import { Button, Esqueleto, EstadoVazio, ErroDeRota } from '@/shared/ui'

// Filtros vivem no URL; valores inválidos regressam ao padrão em vez de rebentar (guia 4.6)
const pesquisaTurmas = z.object({
  classeId: z.string().optional().catch(undefined),
  turno: z.enum(['MANHA', 'TARDE', 'NOITE']).optional().catch(undefined),
  estado: z.enum(['ACTIVA', 'ENCERRADA']).default('ACTIVA').catch('ACTIVA'),
  page: z.number().int().min(1).default(1).catch(1),
})

export const Route = createFileRoute('/turmas/')({
  validateSearch: pesquisaTurmas,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient, anoLectivoId }, deps }) =>
    anoLectivoId ? queryClient.ensureQueryData(turmasQuery({ anoLectivoId, ...deps })) : null,
  pendingComponent: TurmasEsqueleto,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  component: EcraTurmas,
})

function EcraTurmas() {
  const { anoLectivoId } = Route.useRouteContext()
  if (!anoLectivoId) {
    return (
      <EstadoVazio
        titulo="Ainda não há anos lectivos."
        descricao="Crie o primeiro ano lectivo para começar."
      />
    )
  }
  return <ListaTurmas anoLectivoId={anoLectivoId} />
}

function ListaTurmas({ anoLectivoId }: { anoLectivoId: string }) {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const filtros: FiltrosTurma = { anoLectivoId, ...search }
  const { data, isPlaceholderData } = useQuery(turmasQuery(filtros))
  if (!data) return <TurmasEsqueleto />

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-titulo-pagina">Turmas</h1>
        <div
          role="group"
          aria-label="Estado"
          className="flex rounded-controlo bg-linha p-0.5 text-secundario"
        >
          {(['ACTIVA', 'ENCERRADA'] as const).map((estado) => (
            <Link
              key={estado}
              from={Route.fullPath}
              search={(s) => ({ ...s, estado, page: 1 })}
              aria-current={search.estado === estado ? 'page' : undefined}
              className={cn(
                'rounded-[6px] px-3 py-1 text-texto-2',
                search.estado === estado && 'bg-superficie text-texto-1 shadow-elevado',
              )}
            >
              {estado === 'ACTIVA' ? 'Activas' : 'Encerradas'}
            </Link>
          ))}
        </div>
      </div>

      {data.turmas.length === 0 ? (
        <EstadoVazio
          titulo="Ainda não há turmas neste ano."
          descricao="Crie a primeira ou duplique as do ano anterior."
        />
      ) : (
        <div
          className={cn(
            'overflow-hidden rounded-cartao bg-superficie ring-1 ring-linha transition-opacity duration-(--duracao-padrao)',
            isPlaceholderData && 'opacity-60',
          )}
        >
          <table className="w-full text-left">
            <thead className="text-legenda text-texto-3">
              <tr className="border-b border-linha">
                <th scope="col" className="px-4 py-3">
                  Turma
                </th>
                <th scope="col" className="px-4 py-3">
                  Classe
                </th>
                <th scope="col" className="px-4 py-3">
                  Turno
                </th>
                <th scope="col" className="px-4 py-3">
                  Sala
                </th>
                <th scope="col" className="px-4 py-3">
                  Ocupação
                </th>
              </tr>
            </thead>
            <tbody>
              {data.turmas.map((turma) => (
                <tr
                  key={turma.id}
                  className="h-linha border-b border-linha last:border-0 hover:bg-fundo"
                >
                  <td className="px-4 font-medium">{turma.designacao}</td>
                  <td className="px-4 text-texto-2">{turma.classe}</td>
                  <td className="px-4 text-texto-2">{turma.turnoRotulo}</td>
                  <td className="px-4 text-texto-2">{turma.sala ?? '—'}</td>
                  <td className="px-4">
                    <BarraOcupacao turma={turma} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.totalPaginas > 1 && (
        <nav aria-label="Paginação" className="flex items-center justify-end gap-3 text-secundario">
          <span className="tabular text-texto-2">
            Página {data.page} de {data.totalPaginas}
          </span>
          <Button
            tamanho="compacto"
            disabled={search.page <= 1}
            onClick={() => void navigate({ search: (s) => ({ ...s, page: s.page - 1 }) })}
          >
            Anterior
          </Button>
          <Button
            tamanho="compacto"
            disabled={search.page >= data.totalPaginas}
            onClick={() => void navigate({ search: (s) => ({ ...s, page: s.page + 1 }) })}
          >
            Seguinte
          </Button>
        </nav>
      )}
    </section>
  )
}

function TurmasEsqueleto() {
  return (
    <section className="flex flex-col gap-6" aria-busy="true" aria-label="A carregar turmas">
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
