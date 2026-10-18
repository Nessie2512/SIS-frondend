import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import * as z from 'zod/mini'
import { classesQuery } from '@/entities/classe'
import { matriculasQuery, type Matricula } from '@/entities/matricula'
import { ConfirmarLote } from '@/features/confirmar-matricula'
import { VistasGuardadas } from '@/features/guardar-vista'
import { TEMPOS } from '@/shared/config/constantes'
import { Can } from '@/shared/lib/can'
import { esperarSoAoEntrar } from '@/shared/lib/carregar-rota'
import { ordemParaApi, ordemParaUrl, ordenacaoDoUrl } from '@/shared/lib/ordenacao'
import { cn } from '@/shared/lib/cn'
import { useFiltrarEmTransicao } from '@/shared/lib/transicoes'
import { useCan } from '@/shared/lib/permissoes'
import { formatarInstante } from '@/shared/lib/datas'
import {
  Button,
  Campo,
  colunasDe,
  ControloSegmentado,
  ErroDeRota,
  Esqueleto,
  EstadoVazio,
  EtiquetaEstado,
  EtiquetasFiltro,
  Selector,
  TabelaDados,
  type ColunaTabela,
  type EtiquetaFiltro,
} from '@/shared/ui'

const ESTADOS = ['PENDENTE', 'CONFIRMADA', 'CONCLUIDA'] as const

// Filtros no URL: cada vista é uma ligação que se guarda ou partilha (guia 7.1)
const pesquisaMatriculas = z.object({
  classeId: z.catch(z.optional(z.string()), undefined),
  estado: z.catch(z.optional(z.enum(ESTADOS)), undefined),
  semTurma: z.catch(z.optional(z.boolean()), undefined),
  ordem: z.catch(z.optional(z.string()), undefined),
  page: z.catch(z._default(z.int().check(z.minimum(1)), 1), 1),
})

/** Colunas que ordenam no servidor e o campo da API correspondente */
const CAMPOS_ORDEM: Record<string, string> = {
  estudanteNome: 'estudanteNome',
  numeroProcesso: 'numeroProcesso',
  classe: 'classeDesignacao',
  turma: 'turmaDesignacao',
  documentosEmFalta: 'documentosEmFalta',
  estadoRotulo: 'estado',
  criadaEm: 'criadaEm',
}

export const Route = createFileRoute('/_app/matriculas/')({
  validateSearch: pesquisaMatriculas,
  // Sem loaderDeps: mudar filtro ou página mantém o ecrã e os resultados anteriores
  loader: ({ context: { queryClient, anoLectivoId }, location, cause }) => {
    const { ordem, ...filtros } = pesquisaMatriculas.parse(location.search)
    return esperarSoAoEntrar(
      cause,
      anoLectivoId
        ? queryClient.ensureQueryData(
            matriculasQuery({
              anoLectivoId,
              ordenar: ordemParaApi(ordem, CAMPOS_ORDEM),
              ...filtros,
            }),
          )
        : null,
    )
  },
  pendingComponent: () => <Esqueleto className="h-96 w-full" />,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  component: EcraMatriculas,
})

/** Fora do componente: a tabela memoriza as colunas e precisa de funções estáveis */
const nomeDaMatricula = (m: Matricula) => m.estudanteNome

function useColunas(): ColunaTabela<Matricula>[] {
  const { t } = useLingui()
  return useMemo(() => {
    const c = colunasDe<Matricula>()
    return [
      c.accessor('estudanteNome', {
        header: t`Estudante`,
        cell: (info) => (
          <Link
            to="/estudantes/$estudanteId"
            params={{ estudanteId: info.row.original.estudanteId }}
            search={{ separador: 'resumo' }}
            className="inline-flex items-center font-medium hover:text-acento"
            onClick={(e) => e.stopPropagation()}
          >
            {info.getValue()}
          </Link>
        ),
      }),
      c.accessor('numeroProcesso', {
        header: t`Processo`,
        cell: (info) => <span className="tabular text-texto-2">{info.getValue()}</span>,
      }),
      c.accessor('classe', {
        header: t`Classe`,
        cell: (info) => <span className="text-texto-2">{info.getValue()}</span>,
      }),
      c.accessor('turma', {
        header: t`Turma`,
        cell: (info) => (
          <span className={cn('text-texto-2', !info.getValue() && 'text-aviso')}>
            {info.getValue() ?? t`Sem turma`}
          </span>
        ),
      }),
      c.accessor('documentosEmFalta', {
        header: t`Documentos`,
        cell: (info) => {
          const n = info.getValue()
          return n ? (
            <EtiquetaEstado tom="aviso">{t`${n} em falta`}</EtiquetaEstado>
          ) : (
            <span className="text-texto-3">{t`Completos`}</span>
          )
        },
      }),
      c.accessor('estadoRotulo', {
        header: t`Estado`,
        cell: (info) => (
          <EtiquetaEstado tom={info.row.original.estadoTom}>{info.getValue()}</EtiquetaEstado>
        ),
      }),
      c.accessor('criadaEm', {
        header: t`Registada`,
        cell: (info) => (
          <span className="tabular text-secundario text-texto-3">
            {formatarInstante(info.getValue())}
          </span>
        ),
      }),
    ]
  }, [t])
}

/** Matrículas por ano, classe e estado (guia 2.5). */
function EcraMatriculas() {
  const { t } = useLingui()
  const { anoLectivoId, soLeitura } = Route.useRouteContext()
  const { ordem, ...filtros } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { filtrar, aFiltrar } = useFiltrarEmTransicao()
  const { data: classes = [] } = useQuery(classesQuery())
  const { data, isPlaceholderData, isError, refetch } = useQuery({
    ...matriculasQuery({
      anoLectivoId: anoLectivoId ?? '',
      ordenar: ordemParaApi(ordem, CAMPOS_ORDEM),
      ...filtros,
    }),
    enabled: Boolean(anoLectivoId),
  })
  const colunas = useColunas()
  const podeConfirmar = useCan('matriculas:escrever') && !soLeitura
  const total = data?.total ?? 0
  const pagina = data?.page ?? filtros.page
  const totalPaginas = data?.totalPaginas ?? 1

  // Filtros aplicados como etiquetas removíveis (guia 7.1)
  const SITUACOES: Record<string, string> = {
    PENDENTE: t`A confirmar`,
    CONFIRMADA: t`Confirmadas`,
    CONCLUIDA: t`Concluídas`,
  }
  const etiquetas: EtiquetaFiltro[] = [
    ...(filtros.classeId
      ? [
          {
            chave: 'classeId',
            nome: t`Classe`,
            valor: classes.find((c) => c.id === filtros.classeId)?.designacao ?? filtros.classeId,
          },
        ]
      : []),
    ...(filtros.estado
      ? [{ chave: 'estado', nome: t`Situação`, valor: SITUACOES[filtros.estado] ?? filtros.estado }]
      : []),
    ...(filtros.semTurma ? [{ chave: 'semTurma', nome: t`Turma`, valor: t`Sem turma` }] : []),
  ]

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-titulo-pagina">
            <Trans>Matrículas</Trans>
          </h1>
          <p className="tabular text-secundario text-texto-2" aria-live="polite">
            {plural(total, { one: '# matrícula', other: '# matrículas' })}
          </p>
        </div>
        <Can permissao="matriculas:escrever">
          {!soLeitura && (
            <div className="flex gap-2">
              <Button asChild>
                <Link to="/matriculas/renovar">
                  <Trans>Renovar em lote</Trans>
                </Link>
              </Button>
              <Button asChild variante="primario">
                <Link to="/matriculas/nova" data-atalho="novo">
                  <Plus aria-hidden />
                  <Trans>Matricular estudante</Trans>
                </Link>
              </Button>
            </div>
          )}
        </Can>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Campo rotulo={t`Classe`} className="w-56">
          {(c) => (
            <Selector
              {...c}
              placeholder={t`Todas`}
              opcoes={classes.map((x) => ({ valor: x.id, rotulo: x.designacao }))}
              valor={filtros.classeId ?? null}
              aoMudar={(classeId) =>
                filtrar(() =>
                  navigate({
                    search: (s) => ({ ...s, classeId: classeId ?? undefined, page: 1 }),
                  }),
                )
              }
            />
          )}
        </Campo>
        <ControloSegmentado
          rotulo={t`Estado da matrícula`}
          valor={filtros.semTurma ? 'SEM_TURMA' : (filtros.estado ?? 'TODAS')}
          aoMudar={(v) =>
            filtrar(() =>
              navigate({
                search: (s) => ({
                  ...s,
                  page: 1,
                  semTurma: v === 'SEM_TURMA' ? true : undefined,
                  estado: v === 'PENDENTE' || v === 'CONFIRMADA' ? v : undefined,
                }),
              }),
            )
          }
          opcoes={[
            { valor: 'TODAS', rotulo: t`Todas` },
            { valor: 'PENDENTE', rotulo: t`A confirmar` },
            { valor: 'CONFIRMADA', rotulo: t`Confirmadas` },
            { valor: 'SEM_TURMA', rotulo: t`Sem turma` },
          ]}
        />
      </div>

      <EtiquetasFiltro
        etiquetas={etiquetas}
        aoRemover={(chave) =>
          filtrar(() => navigate({ search: (s) => ({ ...s, [chave]: undefined, page: 1 }) }))
        }
        aoLimpar={() => filtrar(() => navigate({ search: { page: 1 } }))}
        className="-mt-3"
      />

      <VistasGuardadas
        ecra="matriculas"
        pesquisa={filtros}
        aoAplicar={(guardados) =>
          filtrar(() => navigate({ search: pesquisaMatriculas.parse({ ...guardados, page: 1 }) }))
        }
        className="-mt-3"
      />

      <div
        aria-busy={isPlaceholderData || aFiltrar || undefined}
        className={cn(
          'transition-opacity duration-(--duracao-padrao)',
          (isPlaceholderData || aFiltrar) && 'opacity-60',
        )}
      >
        <TabelaDados
          rotulo={t`Matrículas`}
          ordenacao={ordenacaoDoUrl(ordem)}
          aoMudarOrdenacao={(o) =>
            filtrar(() => navigate({ search: (s) => ({ ...s, ordem: ordemParaUrl(o), page: 1 }) }))
          }
          colunas={colunas}
          dados={data?.matriculas}
          idDaLinha={(m) => m.id}
          aCarregar={!data}
          erro={isError && !data}
          aoTentarDeNovo={() => void refetch()}
          // Acções em lote (guia 7.1): seleccionar com Espaço ou com a caixa da linha
          seleccionavel={podeConfirmar}
          nomeDaLinha={nomeDaMatricula}
          accoesLote={(ids, limpar) => (
            <ConfirmarLote
              seleccionadas={(data?.matriculas ?? []).filter((m) => ids.includes(m.id))}
              aoTerminar={limpar}
            />
          )}
          vazio={
            <EstadoVazio
              variante={
                filtros.classeId || filtros.estado || filtros.semTurma
                  ? 'sem-resultados'
                  : 'primeira-utilizacao'
              }
              titulo={t`Nenhuma matrícula com estes filtros.`}
              descricao={t`Retire um filtro ou matricule um estudante.`}
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
            disabled={pagina <= 1}
            onClick={() => filtrar(() => navigate({ search: (s) => ({ ...s, page: pagina - 1 }) }))}
          >
            <Trans>Anterior</Trans>
          </Button>
          <Button
            tamanho="compacto"
            disabled={pagina >= totalPaginas}
            onClick={() => filtrar(() => navigate({ search: (s) => ({ ...s, page: pagina + 1 }) }))}
          >
            <Trans>Seguinte</Trans>
          </Button>
        </nav>
      )}
    </section>
  )
}
