import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as z from 'zod/mini'
import { anosLectivosQuery } from '@/entities/ano-lectivo'
import {
  calendarioQuery,
  GrelhaAno,
  intervaloCurto,
  LegendaCalendario,
  type Calendario,
} from '@/entities/calendario'
import { FolhaDia } from '@/features/gerir-eventos'
import { TEMPOS } from '@/shared/config/constantes'
import { cn } from '@/shared/lib/cn'
import { useCan } from '@/shared/lib/permissoes'
import { ErroDeRota, Esqueleto, EstadoVazio } from '@/shared/ui'

export const Route = createFileRoute('/_app/calendario')({
  // O dia aberto vive no URL: «calendário no dia 11 de Novembro» é uma ligação (guia 7.1)
  validateSearch: z.object({
    dia: z.catch(z.optional(z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/))), undefined),
  }),
  loader: ({ context: { queryClient, anoLectivoId } }) =>
    anoLectivoId ? queryClient.ensureQueryData(calendarioQuery(anoLectivoId)) : null,
  pendingComponent: CalendarioEsqueleto,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  component: EcraCalendario,
})

/** Calendário do ano lectivo (guia 2.5, 6.3): vista do ano com trimestres, feriados e eventos. */
function EcraCalendario() {
  const { t } = useLingui()
  const { anoLectivoId, soLeitura } = Route.useRouteContext()
  const { dia } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const podeEscrever = useCan('calendario:escrever')
  const { data: anos = [] } = useQuery(anosLectivosQuery())
  const { data: calendario } = useQuery({
    ...calendarioQuery(anoLectivoId ?? ''),
    enabled: Boolean(anoLectivoId),
  })
  const ano = anos.find((a) => a.id === anoLectivoId)
  const designacao = ano?.designacao

  if (!anoLectivoId || !ano) {
    return (
      <EstadoVazio
        titulo={t`Ainda não há anos lectivos.`}
        descricao={t`Crie o primeiro ano lectivo para ver o calendário.`}
      />
    )
  }
  if (!calendario) return <CalendarioEsqueleto />

  const diaValido = dia && dia >= ano.dataInicio && dia <= ano.dataFim ? dia : undefined

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-titulo-pagina">
            <Trans>Calendário {designacao}</Trans>
          </h1>
          <p className="text-secundario text-texto-2">
            {podeEscrever && !soLeitura
              ? t`Escolha um dia para ver o que acontece e acrescentar um evento.`
              : t`Escolha um dia para ver o que acontece.`}
          </p>
        </div>
        <LegendaCalendario calendario={calendario} />
      </div>

      <GrelhaAno
        calendario={calendario}
        inicio={ano.dataInicio}
        fim={ano.dataFim}
        seleccionado={diaValido}
        aoEscolherDia={(escolhido) => void navigate({ search: { dia: escolhido } })}
      />

      <DatasDoAno calendario={calendario} />

      <FolhaDia
        dia={diaValido}
        calendario={calendario}
        anoLectivoId={anoLectivoId}
        fimDoAno={ano.dataFim}
        podeEditar={podeEscrever && !soLeitura}
        soLeituraPorque={
          soLeitura
            ? t`O ano lectivo está encerrado. O calendário fica só para consulta.`
            : undefined
        }
        aoFechar={() => void navigate({ search: {} })}
      />
    </section>
  )
}

/** Lista cronológica do que não é evento comum: leitura rápida e alternativa à grelha. */
function DatasDoAno({ calendario }: { calendario: Calendario }) {
  const { t } = useLingui()
  const datas = calendario.eventos.filter((e) => e.tipo !== 'EVENTO')
  return (
    <section aria-labelledby="datas-do-ano" className="flex flex-col gap-3">
      <h2 id="datas-do-ano" className="text-titulo-seccao">
        <Trans>Feriados, datas-chave e interrupções</Trans>
      </h2>
      <ul className="grid gap-x-8 sm:grid-cols-2">
        {datas.map((e) => (
          <li key={e.id} className="flex items-baseline gap-3 border-b border-linha py-2">
            <span className="tabular w-28 shrink-0 text-secundario text-texto-2">
              {intervaloCurto(e.inicio, e.fim)}
            </span>
            <span
              className={cn(
                'flex-1',
                e.tipo === 'FERIADO' && 'text-perigo',
                e.tipo === 'INTERRUPCAO' && 'text-texto-2',
              )}
            >
              {e.titulo}
            </span>
            <span className="text-legenda text-texto-3">{e.tipoRotulo}</span>
          </li>
        ))}
      </ul>
      {datas.length === 0 && <p className="text-texto-2">{t`Sem datas marcadas.`}</p>}
    </section>
  )
}

function CalendarioEsqueleto() {
  const { t } = useLingui()
  return (
    <section
      className="flex flex-col gap-8"
      aria-busy="true"
      aria-label={t`A carregar o calendário`}
    >
      <Esqueleto className="h-[34px] w-64" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Esqueleto key={i} className="h-56" />
        ))}
      </div>
    </section>
  )
}
