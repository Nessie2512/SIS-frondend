import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as z from 'zod/mini'
import { disciplinasQuery } from '@/entities/disciplina'
import {
  CargaLectiva,
  professoresQuery,
  professorQuery,
  type EstadoProfessor,
  type ProfessorResumo,
} from '@/entities/professor'
import { VistasGuardadas } from '@/features/guardar-vista'
import { TEMPOS } from '@/shared/config/constantes'
import { esperarSoAoEntrar } from '@/shared/lib/carregar-rota'
import { cn } from '@/shared/lib/cn'
import { formatarTelefone } from '@/shared/lib/formatar'
import {
  Avatar,
  Button,
  Campo,
  colunasDe,
  Entrada,
  ErroDeRota,
  Esqueleto,
  EstadoVazio,
  EtiquetaEstado,
  Folha,
  Selector,
  TabelaDados,
  type ColunaTabela,
} from '@/shared/ui'

const ESTADOS = ['ACTIVO', 'LICENCA', 'SUSPENSO', 'DESLIGADO'] as const

// Pesquisa, filtros, página e professor aberto vivem no URL (guia 7.1)
const pesquisaProfessores = z.object({
  q: z.catch(z.optional(z.string()), undefined),
  disciplinaId: z.catch(z.optional(z.string()), undefined),
  estado: z.catch(z.optional(z.enum(ESTADOS)), undefined),
  page: z.catch(z._default(z.int().check(z.minimum(1)), 1), 1),
  professor: z.catch(z.optional(z.string()), undefined),
})

export const Route = createFileRoute('/_app/professores/')({
  validateSearch: pesquisaProfessores,
  // Sem loaderDeps: pesquisar ou filtrar mantém o ecrã e os resultados anteriores
  loader: ({ context: { queryClient, anoLectivoId }, location, cause }) => {
    const { q, professor: _, ...resto } = pesquisaProfessores.parse(location.search)
    return esperarSoAoEntrar(
      cause,
      anoLectivoId
        ? Promise.all([
            queryClient.ensureQueryData(professoresQuery({ anoLectivoId, pesquisa: q, ...resto })),
            queryClient.ensureQueryData(disciplinasQuery()),
          ])
        : null,
    )
  },
  pendingComponent: ProfessoresEsqueleto,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  component: EcraProfessores,
})

function useColunas(): ColunaTabela<ProfessorResumo>[] {
  const { t } = useLingui()
  return useMemo(() => {
    const c = colunasDe<ProfessorResumo>()
    return [
      c.accessor('nome', {
        header: t`Nome`,
        cell: (info) => (
          <span className="flex items-center gap-3">
            <Avatar
              nome={info.getValue()}
              fotografia={info.row.original.fotografiaUrl}
              tamanho="pequeno"
            />
            <span className="font-medium">{info.getValue()}</span>
          </span>
        ),
      }),
      c.accessor('numeroAgente', {
        header: t`N.º de agente`,
        cell: (info) => <span className="tabular text-texto-2">{info.getValue()}</span>,
      }),
      c.accessor('disciplinasTexto', {
        header: t`Disciplinas`,
        cell: (info) => <span className="text-texto-2">{info.getValue()}</span>,
      }),
      c.accessor('cargaLectiva', {
        header: t`Carga lectiva`,
        cell: (info) => <CargaLectiva professor={info.row.original} />,
      }),
      c.accessor('estadoRotulo', {
        header: t`Estado`,
        cell: (info) => (
          <EtiquetaEstado tom={info.row.original.estadoTom}>{info.getValue()}</EtiquetaEstado>
        ),
      }),
    ]
  }, [t])
}

/** Professores (guia 2.5): lista com pesquisa, filtros, vistas guardadas e painel de resumo. */
function EcraProfessores() {
  const { t } = useLingui()
  const { anoLectivoId } = Route.useRouteContext()
  const { professor: aberto, q, ...filtros } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [texto, setTexto] = useState(q ?? '')
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(espera.current), [])
  const { data: disciplinas = [] } = useQuery(disciplinasQuery())
  const { data, isPlaceholderData, isError, refetch } = useQuery({
    ...professoresQuery({ anoLectivoId: anoLectivoId ?? '', pesquisa: q, ...filtros }),
    enabled: Boolean(anoLectivoId),
  })
  const colunas = useColunas()
  const total = data?.total ?? 0
  const pagina = data?.page ?? filtros.page
  const totalPaginas = data?.totalPaginas ?? 1
  const temFiltros = Boolean(q || filtros.disciplinaId || filtros.estado)

  // Pesquisa à medida que se escreve: espera 120 ms e o URL acompanha (guia 5.6, 7.1)
  function pesquisar(valor: string) {
    setTexto(valor)
    clearTimeout(espera.current)
    espera.current = setTimeout(
      () =>
        void navigate({
          search: (s) => ({ ...s, q: valor.trim() || undefined, page: 1 }),
          replace: true,
        }),
      TEMPOS.pesquisaEspera,
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-titulo-pagina">
          <Trans>Professores</Trans>
        </h1>
        <p className="tabular text-secundario text-texto-2" aria-live="polite">
          {t`${total} professores`}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_14rem_12rem]">
        <Campo rotulo={t`Pesquisar`}>
          {(c) => (
            <Entrada
              {...c}
              type="search"
              data-atalho="pesquisa"
              placeholder={t`Nome ou número de agente`}
              prefixo={<Search aria-hidden />}
              value={texto}
              onChange={(e) => pesquisar(e.target.value)}
            />
          )}
        </Campo>
        <Campo rotulo={t`Disciplina`}>
          {(c) => (
            <Selector
              {...c}
              placeholder={t`Todas`}
              opcoes={disciplinas
                .filter((d) => d.activa)
                .map((d) => ({ valor: d.id, rotulo: d.nome }))}
              valor={filtros.disciplinaId ?? null}
              aoMudar={(disciplinaId) =>
                void navigate({
                  search: (s) => ({ ...s, disciplinaId: disciplinaId ?? undefined, page: 1 }),
                })
              }
            />
          )}
        </Campo>
        <Campo rotulo={t`Estado`}>
          {(c) => (
            <Selector
              {...c}
              placeholder={t`Todos`}
              opcoes={[
                { valor: 'ACTIVO', rotulo: t`Activo` },
                { valor: 'LICENCA', rotulo: t`De licença` },
                { valor: 'SUSPENSO', rotulo: t`Suspenso` },
                { valor: 'DESLIGADO', rotulo: t`Desligado` },
              ]}
              valor={filtros.estado ?? null}
              aoMudar={(estado) =>
                void navigate({
                  search: (s) => ({
                    ...s,
                    estado: (estado ?? undefined) as EstadoProfessor | undefined,
                    page: 1,
                  }),
                })
              }
            />
          )}
        </Campo>
      </div>

      <VistasGuardadas
        ecra="professores"
        pesquisa={{ q, ...filtros }}
        aoAplicar={(guardados) => {
          const nova = pesquisaProfessores.parse({ ...guardados, page: 1 })
          clearTimeout(espera.current)
          setTexto(nova.q ?? '')
          void navigate({ search: nova })
        }}
        className="-mt-3"
      />

      <div
        className={cn(
          'transition-opacity duration-(--duracao-padrao)',
          isPlaceholderData && 'opacity-60',
        )}
      >
        <TabelaDados
          rotulo={t`Professores`}
          semOrdenacao
          colunas={colunas}
          dados={data?.professores}
          idDaLinha={(p) => p.id}
          aCarregar={!data}
          erro={isError && !data}
          aoTentarDeNovo={() => void refetch()}
          idActiva={aberto}
          aoAbrir={(p) => void navigate({ search: (s) => ({ ...s, professor: p.id }) })}
          vazio={
            temFiltros ? (
              <EstadoVazio
                variante="sem-resultados"
                titulo={t`Nenhum professor corresponde à pesquisa.`}
                descricao={t`Verifique o nome ou retire um filtro.`}
                accao={
                  <Button asChild>
                    <Link to="/professores" search={{ page: 1 }}>
                      <Trans>Limpar filtros</Trans>
                    </Link>
                  </Button>
                }
              />
            ) : (
              <EstadoVazio
                titulo={t`Ainda não há professores registados.`}
                descricao={t`Os professores aparecem aqui quando forem admitidos.`}
              />
            )
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
            onClick={() => void navigate({ search: (s) => ({ ...s, page: pagina - 1 }) })}
          >
            <Trans>Anterior</Trans>
          </Button>
          <Button
            tamanho="compacto"
            disabled={pagina >= totalPaginas}
            onClick={() => void navigate({ search: (s) => ({ ...s, page: pagina + 1 }) })}
          >
            <Trans>Seguinte</Trans>
          </Button>
        </nav>
      )}

      <PainelProfessor
        id={aberto}
        anoLectivoId={anoLectivoId ?? ''}
        aoFechar={() => void navigate({ search: (s) => ({ ...s, professor: undefined }) })}
      />
    </section>
  )
}

/** Painel lateral de resumo (guia 6.3): abre a partir da linha e liga à ficha. */
function PainelProfessor({
  id,
  anoLectivoId,
  aoFechar,
}: {
  id: string | undefined
  anoLectivoId: string
  aoFechar: () => void
}) {
  const { t } = useLingui()
  const { data: p } = useQuery({ ...professorQuery(id ?? '', anoLectivoId), enabled: Boolean(id) })
  const agente = p?.numeroAgente
  const turmas = new Set(p?.atribuicoes.map((a) => a.turmaId)).size
  const emFalta = p?.documentosEmFalta ?? 0

  return (
    <Folha
      aberta={Boolean(id)}
      aoMudar={(aberta) => !aberta && aoFechar()}
      titulo={p?.nome ?? t`Professor`}
      descricao={p ? t`Agente n.º ${agente}` : undefined}
      rodape={
        id && (
          <Button asChild variante="primario">
            <Link
              to="/professores/$professorId"
              params={{ professorId: id }}
              search={{ separador: 'resumo' }}
            >
              <Trans>Abrir ficha</Trans>
            </Link>
          </Button>
        )
      }
    >
      {p ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar nome={p.nome} fotografia={p.fotografiaUrl} tamanho="grande" />
            <EtiquetaEstado tom={p.estadoTom}>{p.estadoRotulo}</EtiquetaEstado>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
            <dt className="text-texto-2">{t`Disciplinas`}</dt>
            <dd>{p.disciplinasTexto}</dd>
            <dt className="text-texto-2">{t`Carga lectiva`}</dt>
            <dd>
              <CargaLectiva professor={p} />
            </dd>
            <dt className="text-texto-2">{t`Turmas`}</dt>
            <dd className="tabular">{turmas}</dd>
            <dt className="text-texto-2">{t`Telefone`}</dt>
            <dd className="tabular">{formatarTelefone(p.telefone) ?? '—'}</dd>
            <dt className="text-texto-2">{t`Documentos`}</dt>
            <dd>{emFalta ? t`${emFalta} em falta` : t`Completos`}</dd>
          </dl>
        </div>
      ) : (
        <div className="flex flex-col gap-3" aria-hidden>
          <Esqueleto className="size-16 rounded-full" />
          <Esqueleto className="h-5 w-48" />
          <Esqueleto className="h-5 w-40" />
        </div>
      )}
    </Folha>
  )
}

function ProfessoresEsqueleto() {
  const { t } = useLingui()
  return (
    <section
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label={t`A carregar professores`}
    >
      <Esqueleto className="h-[34px] w-48" />
      <Esqueleto className="h-14 w-full" />
      <Esqueleto className="h-96 w-full" />
    </section>
  )
}
