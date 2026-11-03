import { Trans, useLingui } from '@lingui/react/macro'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, type LinkProps } from '@tanstack/react-router'
import { ChevronRight, ClipboardList, FileWarning, LayoutGrid, UserPlus, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { anosLectivosQuery } from '@/entities/ano-lectivo'
import { meQuery } from '@/entities/utilizador'
import { api } from '@/shared/api'
import { FRESCURA, FUSO_HORARIO, LOCALE, TEMPOS } from '@/shared/config/constantes'
import { cn } from '@/shared/lib/cn'
import { podeAgora, useCan, usePode } from '@/shared/lib/permissoes'
import { Button, ErroDeRota, Esqueleto, EstadoVazio } from '@/shared/ui'
import { useAreas } from '../-casca/areas'

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
    anoLectivoId && podeAgora('painel')
      ? queryClient.ensureQueryData(painelQuery(anoLectivoId))
      : null,
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
  const comPainel = usePode('painel')
  const podeMatriculas = usePode('matriculas')
  const podeTurmas = usePode('turmas')
  const podeEstudantes = usePode('estudantes')
  const podeVerQuadro = usePode('distribuirTurmas')
  const gereTurmas = useCan('turmas:escrever')
  const matricula = useCan('matriculas:escrever')
  const podeColocar = gereTurmas || matricula
  const podeMatricular = usePode('matricular')
  const podeUtilizadores = usePode('utilizadores')
  const { principais, definicoes } = useAreas()
  // Definições no fim: para o gestor de TI, é lá que gere as contas
  const areas = [
    ...principais.filter((a) => a.id !== 'inicio'),
    podeUtilizadores
      ? { ...definicoes, descricao: t`Contas dos utilizadores, perfis de acesso e preferências.` }
      : definicoes,
  ]
  const { data: painel } = useQuery({
    ...painelQuery(anoLectivoId ?? ''),
    enabled: Boolean(anoLectivoId) && comPainel,
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
  // Indicadores só de quem pode abrir o ecrã para onde levam
  const indicadores = comPainel && (podeMatriculas || podeTurmas)
  const accoes = !soLeitura && (podeMatricular || (podeVerQuadro && podeColocar) || podeEstudantes)

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-titulo-pagina">{saudacao}</h1>
        <p className="text-secundario text-texto-2">
          {!indicadores ? (
            <Trans>Ano lectivo {designacao}.</Trans>
          ) : tudoEmDia ? (
            <Trans>Ano lectivo {designacao}. Não há nada pendente.</Trans>
          ) : (
            <Trans>Ano lectivo {designacao}. Isto pede a sua atenção:</Trans>
          )}
        </p>
      </div>

      {indicadores && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {podeMatriculas && (
            <>
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
            </>
          )}
          {podeTurmas && (
            <Indicador
              valor={cheias}
              rotulo={t`Turmas cheias`}
              descricao={t`Lotação máxima atingida`}
              icone={<Users />}
              tom="neutro"
              ligacao={{ to: '/turmas' }}
            />
          )}
        </ul>
      )}

      {accoes && (
        <div className="flex flex-col gap-3">
          <h2 className="text-titulo-seccao">
            <Trans>Acções rápidas</Trans>
          </h2>
          <div className="flex flex-wrap gap-2">
            {podeMatricular && (
              <Button variante="primario" asChild>
                <Link to="/matriculas/nova">
                  <UserPlus aria-hidden className="size-4 stroke-[1.5]" />
                  <Trans>Matricular estudante</Trans>
                </Link>
              </Button>
            )}
            {podeVerQuadro && podeColocar && (
              <Button asChild>
                <Link to="/turmas/quadro">
                  <LayoutGrid aria-hidden className="size-4 stroke-[1.5]" />
                  <Trans>Distribuir por turmas</Trans>
                </Link>
              </Button>
            )}
            {podeEstudantes && (
              <Button asChild>
                <Link to="/estudantes" search={{ page: 1 }}>
                  <Trans>Procurar estudante</Trans>
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* O que este perfil pode abrir: cada utilizador vê só as suas áreas (guia 2.7) */}
      <div className="flex flex-col gap-3">
        <h2 className="text-titulo-seccao">
          <Trans>As suas áreas</Trans>
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <li key={area.id}>
              <Link
                {...area.ligacao}
                className="group flex h-full items-start gap-3 rounded-cartao bg-superficie p-4 ring-1 ring-linha transition-shadow duration-(--duracao-micro) hover:shadow-elevado [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]"
              >
                <span aria-hidden className="text-acento">
                  {area.icone}
                </span>
                <span className="flex flex-col">
                  <span className="text-corpo font-medium">{area.rotulo}</span>
                  <span className="text-secundario text-texto-2">{area.descricao}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
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
