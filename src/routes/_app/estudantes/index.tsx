import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { FileUp, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as z from 'zod/mini'
import { classesQuery } from '@/entities/classe'
import { EmitirEmLote } from '@/features/emitir-documento'
import { ExportarSeleccao } from '@/features/exportar-estudantes'
import { VistasGuardadas } from '@/features/guardar-vista'
import {
  estudanteQuery,
  estudantesQuery,
  EtiquetaEstadoEstudante,
  formatarTelefone,
  type EstudanteResumo,
} from '@/entities/estudante'
import { TEMPOS } from '@/shared/config/constantes'
import { Can } from '@/shared/lib/can'
import { useCan } from '@/shared/lib/permissoes'
import { esperarSoAoEntrar } from '@/shared/lib/carregar-rota'
import { cn } from '@/shared/lib/cn'
import { formatarDataCivil } from '@/shared/lib/datas'
import { ordemParaApi, ordemParaUrl, ordenacaoDoUrl } from '@/shared/lib/ordenacao'
import {
  Avatar,
  Button,
  Campo,
  colunasDe,
  ControloSegmentado,
  Entrada,
  ErroDeRota,
  Esqueleto,
  EstadoVazio,
  EtiquetaEstado,
  EtiquetasFiltro,
  Folha,
  Selector,
  TabelaDados,
  type ColunaTabela,
  type EtiquetaFiltro,
} from '@/shared/ui'

const ESTADOS = ['ACTIVO', 'TRANSFERIDO', 'DESISTENTE', 'CONCLUIDO', 'ANULADO'] as const
type Estado = (typeof ESTADOS)[number]

// Pesquisa, filtros, página e estudante aberto vivem no URL (guia 4.2, 7.1)
const pesquisaEstudantes = z.object({
  q: z.catch(z.optional(z.string()), undefined),
  classeId: z.catch(z.optional(z.string()), undefined),
  estado: z.catch(z.optional(z.enum(ESTADOS)), undefined),
  // Filtros avançados (painel próprio, guia 7.1)
  semTurma: z.catch(z.optional(z.boolean()), undefined),
  documentosEmFalta: z.catch(z.optional(z.boolean()), undefined),
  sexo: z.catch(z.optional(z.enum(['M', 'F'])), undefined),
  ordem: z.catch(z.optional(z.string()), undefined),
  page: z.catch(z._default(z.int().check(z.minimum(1)), 1), 1),
  estudante: z.catch(z.optional(z.string()), undefined),
})

/** Colunas que ordenam no servidor e o campo da API correspondente */
const CAMPOS_ORDEM: Record<string, string> = {
  nome: 'nome',
  numeroProcesso: 'numeroProcesso',
  documentosEmFalta: 'documentosEmFalta',
}

export const Route = createFileRoute('/_app/estudantes/')({
  validateSearch: pesquisaEstudantes,
  // Sem loaderDeps: pesquisar ou filtrar não cria uma nova correspondência de rota nem esqueleto
  loader: ({ context: { queryClient, anoLectivoId }, location, cause }) => {
    const { q, estudante: _, ordem, ...resto } = pesquisaEstudantes.parse(location.search)
    return esperarSoAoEntrar(
      cause,
      anoLectivoId
        ? Promise.all([
            queryClient.ensureQueryData(
              estudantesQuery({
                anoLectivoId,
                pesquisa: q,
                ordenar: ordemParaApi(ordem, CAMPOS_ORDEM),
                ...resto,
              }),
            ),
            queryClient.ensureQueryData(classesQuery()),
          ])
        : null,
    )
  },
  pendingComponent: EstudantesEsqueleto,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  component: EcraEstudantes,
})

function useColunas(): ColunaTabela<EstudanteResumo>[] {
  const { t } = useLingui()
  return useMemo(() => {
    const c = colunasDe<EstudanteResumo>()
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
      c.accessor('numeroProcesso', {
        header: t`Processo`,
        cell: (info) => <span className="tabular text-texto-2">{info.getValue()}</span>,
      }),
      c.accessor('matricula', {
        header: t`Matrícula`,
        enableSorting: false,
        cell: (info) => (
          <span className={cn('text-texto-2', info.row.original.semTurma && 'text-aviso')}>
            {info.getValue() ?? t`Sem matrícula neste ano`}
          </span>
        ),
      }),
      c.accessor('documentosEmFalta', {
        header: t`Documentos`,
        cell: (info) => {
          const emFalta = info.getValue()
          return emFalta > 0 ? (
            <EtiquetaEstado tom="aviso">{t`${emFalta} em falta`}</EtiquetaEstado>
          ) : (
            <span className="text-texto-3">{t`Completos`}</span>
          )
        },
      }),
      c.accessor('estadoRotulo', {
        header: t`Estado`,
        enableSorting: false,
        cell: (info) => <EtiquetaEstadoEstudante estudante={info.row.original} />,
      }),
    ]
  }, [t])
}

function EcraEstudantes() {
  const { t } = useLingui()
  const { anoLectivoId } = Route.useRouteContext()
  const { estudante: aberto, q, ordem, ...filtros } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const podeEmitir = useCan('documentos:emitir')
  const [texto, setTexto] = useState(q ?? '')
  // Ref e não estado: com teclas mais rápidas do que as renderizações, um estado desactualizado
  // deixava temporizadores antigos por cancelar e o URL ficava com texto truncado
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(espera.current), [])
  const { data: classes = [] } = useQuery(classesQuery())
  const { data, isPlaceholderData, isError, refetch } = useQuery({
    ...estudantesQuery({
      anoLectivoId: anoLectivoId ?? '',
      pesquisa: q,
      ordenar: ordemParaApi(ordem, CAMPOS_ORDEM),
      ...filtros,
    }),
    enabled: Boolean(anoLectivoId),
  })
  const colunas = useColunas()
  const pagina = data?.page ?? filtros.page
  const totalPaginas = data?.totalPaginas ?? 1
  const total = data?.total ?? 0
  const temFiltros = Boolean(
    q ||
    filtros.classeId ||
    filtros.estado ||
    filtros.semTurma ||
    filtros.documentosEmFalta ||
    filtros.sexo,
  )
  const [avancados, setAvancados] = useState(false)

  const opcoesEstado = [
    { valor: 'ACTIVO', rotulo: t`Activo` },
    { valor: 'TRANSFERIDO', rotulo: t`Transferido` },
    { valor: 'DESISTENTE', rotulo: t`Desistente` },
    { valor: 'CONCLUIDO', rotulo: t`Concluído` },
    { valor: 'ANULADO', rotulo: t`Anulado` },
  ]

  // Filtros aplicados como etiquetas removíveis (guia 7.1)
  const etiquetas: EtiquetaFiltro[] = [
    ...(q ? [{ chave: 'q', nome: t`Pesquisa`, valor: q }] : []),
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
      ? [
          {
            chave: 'estado',
            nome: t`Estado`,
            valor: opcoesEstado.find((o) => o.valor === filtros.estado)?.rotulo ?? filtros.estado,
          },
        ]
      : []),
    ...(filtros.semTurma ? [{ chave: 'semTurma', nome: t`Turma`, valor: t`sem turma` }] : []),
    ...(filtros.documentosEmFalta
      ? [{ chave: 'documentosEmFalta', nome: t`Documentos`, valor: t`em falta` }]
      : []),
    ...(filtros.sexo
      ? [{ chave: 'sexo', nome: t`Sexo`, valor: filtros.sexo === 'F' ? t`Feminino` : t`Masculino` }]
      : []),
  ]

  function retirarFiltro(chave: string) {
    if (chave === 'q') {
      clearTimeout(espera.current)
      setTexto('')
    }
    void navigate({ search: (s) => ({ ...s, [chave]: undefined, page: 1 }) })
  }

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
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-titulo-pagina">
            <Trans>Estudantes</Trans>
          </h1>
          <p className="tabular text-secundario text-texto-2" aria-live="polite">
            {plural(total, { one: '# estudante', other: '# estudantes' })}
          </p>
        </div>
        <Can permissao="matriculas:escrever">
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/estudantes/importar">
                <FileUp aria-hidden />
                <Trans>Importar</Trans>
              </Link>
            </Button>
            <Button asChild variante="primario">
              <Link to="/matriculas/nova" data-atalho="novo">
                <Plus aria-hidden />
                <Trans>Matricular estudante</Trans>
              </Link>
            </Button>
          </div>
        </Can>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_14rem_12rem]">
        <Campo rotulo={t`Pesquisar`}>
          {(c) => (
            <Entrada
              {...c}
              type="search"
              data-atalho="pesquisa"
              placeholder={t`Nome ou número de processo`}
              prefixo={<Search aria-hidden />}
              value={texto}
              onChange={(e) => pesquisar(e.target.value)}
            />
          )}
        </Campo>
        <Campo rotulo={t`Classe`}>
          {(c) => (
            <Selector
              {...c}
              placeholder={t`Todas`}
              opcoes={classes.map((classe) => ({ valor: classe.id, rotulo: classe.designacao }))}
              valor={filtros.classeId ?? null}
              aoMudar={(classeId) =>
                void navigate({
                  search: (s) => ({ ...s, classeId: classeId ?? undefined, page: 1 }),
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
              opcoes={opcoesEstado}
              valor={filtros.estado ?? null}
              aoMudar={(estado) =>
                void navigate({
                  search: (s) => ({
                    ...s,
                    estado: (estado ?? undefined) as Estado | undefined,
                    page: 1,
                  }),
                })
              }
            />
          )}
        </Campo>
      </div>

      <div className="-mt-3 flex">
        <Button
          tamanho="compacto"
          variante="discreto"
          aria-haspopup="dialog"
          onClick={() => setAvancados(true)}
        >
          <SlidersHorizontal aria-hidden className="size-4 stroke-[1.5]" />
          <Trans>Filtros avançados</Trans>
        </Button>
      </div>
      {avancados && (
        <FiltrosAvancados
          aberta
          aoFechar={() => setAvancados(false)}
          valores={{
            semTurma: filtros.semTurma ?? false,
            documentosEmFalta: filtros.documentosEmFalta ?? false,
            sexo: filtros.sexo,
          }}
          aoAplicar={(v) => {
            setAvancados(false)
            void navigate({
              search: (s) => ({
                ...s,
                semTurma: v.semTurma || undefined,
                documentosEmFalta: v.documentosEmFalta || undefined,
                sexo: v.sexo,
                page: 1,
              }),
            })
          }}
        />
      )}

      <EtiquetasFiltro
        etiquetas={etiquetas}
        aoRemover={retirarFiltro}
        aoLimpar={() => {
          clearTimeout(espera.current)
          setTexto('')
          void navigate({ search: { page: 1 } })
        }}
        className="-mt-3"
      />

      <VistasGuardadas
        ecra="estudantes"
        pesquisa={{ q, ...filtros }}
        aoAplicar={(guardados) => {
          const nova = pesquisaEstudantes.parse({ ...guardados, page: 1 })
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
          rotulo={t`Estudantes`}
          ordenacao={ordenacaoDoUrl(ordem)}
          aoMudarOrdenacao={(o) =>
            void navigate({ search: (s) => ({ ...s, ordem: ordemParaUrl(o), page: 1 }) })
          }
          colunas={colunas}
          dados={data?.estudantes}
          idDaLinha={(e) => e.id}
          aCarregar={!data}
          erro={isError && !data}
          aoTentarDeNovo={() => void refetch()}
          idActiva={aberto}
          aoAbrir={(e) => void navigate({ search: (s) => ({ ...s, estudante: e.id }) })}
          // Acções em lote (guia 6.3, 7.1): Espaço ou a caixa da linha; a barra flutua em baixo
          seleccionavel
          nomeDaLinha={(e) => e.nome}
          accoesLote={(ids, limpar) => (
            <>
              <ExportarSeleccao ids={ids} />
              {podeEmitir && anoLectivoId && (
                <EmitirEmLote anoLectivoId={anoLectivoId} estudanteIds={ids} aoTerminar={limpar} />
              )}
            </>
          )}
          vazio={
            temFiltros ? (
              <EstadoVazio
                variante="sem-resultados"
                titulo={t`Nenhum estudante corresponde à pesquisa.`}
                descricao={t`Verifique o nome ou retire um filtro.`}
                accao={
                  <Button asChild>
                    <Link to="/estudantes" search={{ page: 1 }}>
                      <Trans>Limpar filtros</Trans>
                    </Link>
                  </Button>
                }
              />
            ) : (
              <EstadoVazio
                titulo={t`Ainda não há estudantes neste ano.`}
                descricao={t`Comece por matricular o primeiro.`}
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

      <PainelEstudante
        id={aberto}
        aoFechar={() => void navigate({ search: (s) => ({ ...s, estudante: undefined }) })}
      />
    </section>
  )
}

/** Painel lateral de resumo (guia 6.3): abre a partir da linha, o URL regista-o, ligação para a ficha. */
function PainelEstudante({ id, aoFechar }: { id: string | undefined; aoFechar: () => void }) {
  const { t } = useLingui()
  const { data: e } = useQuery({ ...estudanteQuery(id ?? ''), enabled: Boolean(id) })
  const processo = e?.numeroProcesso
  const idade = e?.idade ?? 0
  const emFalta = e?.documentosEmFalta ?? 0

  return (
    <Folha
      aberta={Boolean(id)}
      aoMudar={(aberta) => !aberta && aoFechar()}
      titulo={e?.nome ?? t`Estudante`}
      descricao={e ? t`Processo ${processo}` : undefined}
      rodape={
        id && (
          <Button asChild variante="primario">
            <Link
              to="/estudantes/$estudanteId"
              params={{ estudanteId: id }}
              search={{ separador: 'resumo' }}
            >
              <Trans>Abrir ficha</Trans>
            </Link>
          </Button>
        )
      }
    >
      {e ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar nome={e.nome} fotografia={e.fotografiaUrl} tamanho="grande" />
            <EtiquetaEstadoEstudante estudante={e} />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
            <dt className="text-texto-2">{t`Matrícula`}</dt>
            <dd>{e.matricula ?? '—'}</dd>
            <dt className="text-texto-2">{t`Nascimento`}</dt>
            <dd className="tabular">
              {formatarDataCivil(e.dataNascimento)} ·{' '}
              {plural(idade, { one: '# ano', other: '# anos' })}
            </dd>
            <dt className="text-texto-2">{t`Telefone`}</dt>
            <dd className="tabular">{formatarTelefone(e.telefone) ?? '—'}</dd>
            <dt className="text-texto-2">{t`Documentos`}</dt>
            <dd>
              {emFalta
                ? plural(emFalta, {
                    one: '# obrigatório em falta',
                    other: '# obrigatórios em falta',
                  })
                : t`Completos`}
            </dd>
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

function EstudantesEsqueleto() {
  const { t } = useLingui()
  return (
    <section className="flex flex-col gap-6" aria-busy="true" aria-label={t`A carregar estudantes`}>
      <Esqueleto className="h-[34px] w-48" />
      <Esqueleto className="h-14 w-full" />
      <Esqueleto className="h-96 w-full" />
    </section>
  )
}

interface ValoresAvancados {
  semTurma: boolean
  documentosEmFalta: boolean
  sexo: 'M' | 'F' | undefined
}

/** Filtros avançados num painel próprio (guia 7.1); aplicam-se juntos e viram etiquetas. */
function FiltrosAvancados({
  aberta,
  aoFechar,
  valores,
  aoAplicar,
}: {
  aberta: boolean
  aoFechar: () => void
  valores: ValoresAvancados
  aoAplicar: (v: ValoresAvancados) => void
}) {
  const { t } = useLingui()
  const [rascunho, setRascunho] = useState(valores)
  return (
    <Folha
      aberta={aberta}
      aoMudar={(v) => !v && aoFechar()}
      titulo={t`Filtros avançados`}
      rodape={
        <>
          <Button
            onClick={() =>
              setRascunho({ semTurma: false, documentosEmFalta: false, sexo: undefined })
            }
          >
            <Trans>Limpar</Trans>
          </Button>
          <Button variante="primario" onClick={() => aoAplicar(rascunho)}>
            <Trans>Aplicar</Trans>
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={rascunho.semTurma}
            onChange={(e) => setRascunho((r) => ({ ...r, semTurma: e.target.checked }))}
            className="size-4 accent-(--color-acento)"
          />
          <Trans>Matriculados sem turma</Trans>
        </label>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={rascunho.documentosEmFalta}
            onChange={(e) => setRascunho((r) => ({ ...r, documentosEmFalta: e.target.checked }))}
            className="size-4 accent-(--color-acento)"
          />
          <Trans>Com documentos obrigatórios em falta</Trans>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-legenda text-texto-2">
            <Trans>Sexo</Trans>
          </span>
          <ControloSegmentado
            rotulo={t`Sexo`}
            valor={rascunho.sexo ?? 'todos'}
            aoMudar={(v) =>
              setRascunho((r) => ({ ...r, sexo: v === 'todos' ? undefined : (v as 'M' | 'F') }))
            }
            opcoes={[
              { valor: 'todos', rotulo: t`Todos` },
              { valor: 'F', rotulo: t`Feminino` },
              { valor: 'M', rotulo: t`Masculino` },
            ]}
          />
        </div>
      </div>
    </Folha>
  )
}
