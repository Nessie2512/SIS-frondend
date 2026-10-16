import { Trans, useLingui } from '@lingui/react/macro'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, type LinkProps } from '@tanstack/react-router'
import { ChevronRight, ClipboardList, FileWarning, LayoutGrid, UserPlus, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { anosLectivosQuery } from '@/entities/ano-lectivo'
import { meQuery } from '@/entities/utilizador'
import { api } from '@/shared/api'
import { FRESCURA, FUSO_HORARIO, LOCALE, TEMPOS } from '@/shared/config/constantes'
import { Can } from '@/shared/lib/can'
import { cn } from '@/shared/lib/cn'
import { Button, ErroDeRota, Esqueleto, EstadoVazio } from '@/shared/ui'

const painelQuery = (anoLectivoId: string) =>
  queryOptions({
    queryKey: ['painel', anoLectivoId] as const,
    queryFn: async ({ signal }) => {
      const { data } = await api.GET('/painel', { params: { query: { anoLectivoId } }, signal })
      return data!
    },
    staleTime: FRESCURA.painel,
  })

export const Route = createFileRoute('/_app/')({
  loader: ({ context: { queryClient, anoLectivoId } }) =>
    anoLectivoId ? queryClient.ensureQueryData(painelQuery(anoLectivoId)) : null,
  pendingComponent: InicioEsqueleto,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  component: Inicio,
})

/**
 * Início (guia 2.3, 6.3): o que pede atenção hoje. Cada indicador abre o ecrã já filtrado;
 * as acções mais frequentes ficam a um clique.
 */
function Inicio() {
  const { t } = useLingui()
  const { anoLectivoId, soLeitura } = Route.useRouteContext()
  const { data: eu } = useQuery(meQuery())
  const { data: anos = [] } = useQuery(anosLectivosQuery())
  const { data: painel } = useQuery({
    ...painelQuery(anoLectivoId ?? ''),
    enabled: Boolean(anoLectivoId),
  })
  const designacao = anos.find((a) => a.id === anoLectivoId)?.designacao
  const nome = eu?.nome.split(' ')[0] ?? ''
  const hora = Number(
    new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', timeZone: FUSO_HORARIO }).format(new Date()),
  )
  const saudacao =
    hora < 12 ? t`Bom dia, ${nome}` : hora < 19 ? t`Boa tarde, ${nome}` : t`Boa noite, ${nome}`

  if (!anoLectivoId) {
    return (
      <EstadoVazio
        titulo={t`Ainda não há anos lectivos.`}
        descricao={t`Crie o primeiro ano lectivo para começar.`}
      />
    )
  }

  const pendentes = painel?.matriculasPendentes ?? 0
  const documentos = painel?.documentosEmFalta ?? 0
  const semTurma = painel?.estudantesSemTurma ?? 0
  const cheias = painel?.turmasCheias ?? 0
  const tudoEmDia = painel && pendentes + documentos + semTurma + cheias === 0

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-titulo-pagina">{saudacao}</h1>
        <p className="text-secundario text-texto-2">
          {tudoEmDia ? (
            <Trans>Ano lectivo {designacao}. Não há nada pendente.</Trans>
          ) : (
            <Trans>Ano lectivo {designacao}. Isto pede a sua atenção:</Trans>
          )}
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador
          valor={pendentes}
          rotulo={t`Matrículas a confirmar`}
          descricao={t`Aguardam documentos obrigatórios`}
          icone={<ClipboardList />}
          ligacao={{ to: '/matriculas', search: { page: 1, estado: 'PENDENTE' } }}
        />
        <Indicador
          valor={documentos}
          rotulo={t`Documentos em falta`}
          descricao={t`Obrigatórios ainda não entregues`}
          icone={<FileWarning />}
          ligacao={{ to: '/matriculas', search: { page: 1, estado: 'PENDENTE' } }}
        />
        <Indicador
          valor={semTurma}
          rotulo={t`Estudantes sem turma`}
          descricao={t`Matriculados, por distribuir`}
          icone={<LayoutGrid />}
          ligacao={{ to: '/matriculas', search: { page: 1, semTurma: true } }}
        />
        <Indicador
          valor={cheias}
          rotulo={t`Turmas cheias`}
          descricao={t`Lotação máxima atingida`}
          icone={<Users />}
          tom="neutro"
          ligacao={{ to: '/turmas' }}
        />
      </ul>

      {!soLeitura && (
        <div className="flex flex-col gap-3">
          <h2 className="text-titulo-seccao">
            <Trans>Acções rápidas</Trans>
          </h2>
          <div className="flex flex-wrap gap-2">
            <Can permissao="matriculas:escrever">
              <Button variante="primario" asChild>
                <Link to="/matriculas/nova">
                  <UserPlus aria-hidden className="size-4 stroke-[1.5]" />
                  <Trans>Matricular estudante</Trans>
                </Link>
              </Button>
            </Can>
            <Button asChild>
              <Link to="/turmas/quadro">
                <LayoutGrid aria-hidden className="size-4 stroke-[1.5]" />
                <Trans>Distribuir por turmas</Trans>
              </Link>
            </Button>
            <Button asChild>
              <Link to="/estudantes" search={{ page: 1 }}>
                <Trans>Procurar estudante</Trans>
              </Link>
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

function Indicador({
  valor,
  rotulo,
  descricao,
  icone,
  ligacao,
  tom = 'aviso',
}: {
  valor: number
  rotulo: string
  descricao: string
  icone: ReactNode
  ligacao: LinkProps
  /** Marca de atenção quando há algo pendente */
  tom?: 'aviso' | 'neutro'
}) {
  return (
    <li>
      <Link
        {...ligacao}
        className="group flex h-full flex-col gap-3 rounded-cartao bg-superficie p-4 ring-1 ring-linha transition-shadow duration-(--duracao-micro) hover:shadow-elevado"
      >
        <span className="flex items-center justify-between text-texto-2 [&_svg]:size-4 [&_svg]:stroke-[1.5]">
          {icone}
          <ChevronRight
            aria-hidden
            className="opacity-0 transition-opacity duration-(--duracao-micro) group-hover:opacity-100"
          />
        </span>
        <span className="flex items-center gap-2">
          <span className="tabular text-titulo-pagina">{valor}</span>
          {/* Marca de atenção a cor; o número diz o mesmo, por isso fica escondida dos leitores */}
          <span
            aria-hidden
            className={cn(
              'size-2 rounded-full',
              valor > 0 && tom === 'aviso' ? 'bg-aviso' : 'hidden',
            )}
          />
        </span>
        <span className="flex flex-col">
          <span className="text-corpo font-medium">{rotulo}</span>
          <span className="text-secundario text-texto-2">{descricao}</span>
        </span>
      </Link>
    </li>
  )
}

function InicioEsqueleto() {
  const { t } = useLingui()
  return (
    <section className="flex flex-col gap-8" aria-busy="true" aria-label={t`A carregar o início`}>
      <Esqueleto className="h-[34px] w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Esqueleto key={i} className="h-36" />
        ))}
      </div>
    </section>
  )
}
