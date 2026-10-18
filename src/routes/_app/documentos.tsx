import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Download, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as z from 'zod/mini'
import {
  documentosEmitidosQuery,
  type DocumentoOficial,
  type EstadoDocumentoOficial,
  type TipoDocumentoOficial,
} from '@/entities/documento-oficial'
import { DialogoAnular, EmitirDocumentoGlobal, EmitirEmLote } from '@/features/emitir-documento'
import { TEMPOS } from '@/shared/config/constantes'
import { esperarSoAoEntrar } from '@/shared/lib/carregar-rota'
import { cn } from '@/shared/lib/cn'
import { formatarInstante } from '@/shared/lib/datas'
import { ordemParaApi, ordemParaUrl, ordenacaoDoUrl } from '@/shared/lib/ordenacao'
import { useCan } from '@/shared/lib/permissoes'
import {
  Button,
  Campo,
  colunasDe,
  Entrada,
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

const TIPOS = [
  'DECLARACAO_MATRICULA',
  'DECLARACAO_FREQUENCIA',
  'GUIA_TRANSFERENCIA',
  'CERTIFICADO_HABILITACOES',
] as const
const ESTADOS = ['VALIDO', 'ANULADO'] as const

// Pesquisa, filtros, ordem e página vivem no URL (guia 7.1)
const pesquisaDocumentos = z.object({
  q: z.catch(z.optional(z.string()), undefined),
  tipo: z.catch(z.optional(z.enum(TIPOS)), undefined),
  estado: z.catch(z.optional(z.enum(ESTADOS)), undefined),
  ordem: z.catch(z.optional(z.string()), undefined),
  page: z.catch(z._default(z.int().check(z.minimum(1)), 1), 1),
})

/** Colunas que ordenam no servidor e o campo da API correspondente */
const CAMPOS_ORDEM: Record<string, string> = {
  numero: 'numero',
  estudanteNome: 'estudanteNome',
  emitidoEm: 'emitidoEm',
  estado: 'estado',
}

export const Route = createFileRoute('/_app/documentos')({
  validateSearch: pesquisaDocumentos,
  loader: ({ context: { queryClient }, location, cause }) => {
    const { q, ordem, ...resto } = pesquisaDocumentos.parse(location.search)
    return esperarSoAoEntrar(
      cause,
      queryClient.ensureQueryData(
        documentosEmitidosQuery({
          pesquisa: q,
          ordenar: ordemParaApi(ordem, CAMPOS_ORDEM),
          ...resto,
        }),
      ),
    )
  },
  pendingComponent: DocumentosEsqueleto,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  component: EcraDocumentos,
})

function useColunas(
  podeAnular: boolean,
  aoAnular: (d: DocumentoOficial) => void,
): ColunaTabela<DocumentoOficial>[] {
  const { t } = useLingui()
  return useMemo(() => {
    const c = colunasDe<DocumentoOficial>()
    return [
      c.accessor('numero', {
        header: t`Documento`,
        cell: (info) => {
          const d = info.row.original
          const anulado = d.estado === 'ANULADO'
          return (
            <span className="flex flex-col">
              <span className={cn('font-medium', anulado && 'text-texto-3 line-through')}>
                {d.titulo}
              </span>
              <span className="tabular text-secundario text-texto-2">{d.numero}</span>
            </span>
          )
        },
      }),
      c.accessor('estudanteNome', {
        header: t`Estudante`,
        cell: (info) => {
          const processo = info.row.original.numeroProcesso
          return (
            <span className="flex flex-col">
              <span>{info.getValue()}</span>
              <span className="tabular text-secundario text-texto-2">{t`Processo n.º ${processo}`}</span>
            </span>
          )
        },
      }),
      c.accessor('emitidoEm', {
        header: t`Emitido`,
        cell: (info) => (
          <span className="flex flex-col">
            <span className="tabular">{formatarInstante(info.getValue())}</span>
            <span className="text-secundario text-texto-2">{info.row.original.emitidoPor}</span>
          </span>
        ),
      }),
      c.accessor('estado', {
        header: t`Estado`,
        cell: (info) => {
          const motivo = info.row.original.motivoAnulacao
          return info.getValue() === 'ANULADO' ? (
            <span className="flex flex-col items-start gap-1">
              <EtiquetaEstado tom="perigo">{t`Anulado`}</EtiquetaEstado>
              {motivo && <span className="text-secundario text-texto-2">{motivo}</span>}
            </span>
          ) : (
            <EtiquetaEstado tom="sucesso">{t`Válido`}</EtiquetaEstado>
          )
        },
      }),
      c.display({
        id: 'accoes',
        header: () => <span className="sr-only">{t`Acções`}</span>,
        cell: (info) => {
          const d = info.row.original
          const titulo = d.titulo
          const numero = d.numero
          return (
            <span className="flex flex-wrap justify-end gap-3 text-secundario">
              <a
                href={d.pdfUrl}
                download
                onClick={(e) => e.stopPropagation()}
                aria-label={t`Descarregar ${titulo} ${numero}`}
                className="inline-flex min-h-6 items-center gap-1 text-acento hover:underline"
              >
                <Download aria-hidden className="size-4 stroke-[1.5]" />
                <Trans>PDF</Trans>
              </a>
              {podeAnular && d.estado === 'VALIDO' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    aoAnular(d)
                  }}
                  aria-label={t`Anular ${titulo} ${numero}`}
                  className="min-h-6 text-perigo hover:underline"
                >
                  <Trans>Anular</Trans>
                </button>
              )}
            </span>
          )
        },
      }),
    ]
  }, [t, podeAnular, aoAnular])
}

/**
 * Documentos (guia 2.5, 6.3): todos os documentos oficiais emitidos na escola, com pesquisa e
 * filtros, e emissão a partir daqui. Anulados continuam visíveis, riscados e com o motivo.
 */
function EcraDocumentos() {
  const { t } = useLingui()
  const { anoLectivoId } = Route.useRouteContext()
  const { q, ordem, ...filtros } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const podeEmitir = useCan('documentos:emitir')
  const [texto, setTexto] = useState(q ?? '')
  const [aAnular, setAAnular] = useState<DocumentoOficial>()
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(espera.current), [])
  const { data, isPlaceholderData, isError, refetch } = useQuery(
    documentosEmitidosQuery({
      pesquisa: q,
      ordenar: ordemParaApi(ordem, CAMPOS_ORDEM),
      ...filtros,
    }),
  )
  const colunas = useColunas(podeEmitir, setAAnular)
  const total = data?.total ?? 0
  const pagina = data?.page ?? filtros.page
  const totalPaginas = data?.totalPaginas ?? 1
  const temFiltros = Boolean(q || filtros.tipo || filtros.estado)

  const opcoesTipo: { valor: TipoDocumentoOficial; rotulo: string }[] = [
    { valor: 'DECLARACAO_MATRICULA', rotulo: t`Declaração de matrícula` },
    { valor: 'DECLARACAO_FREQUENCIA', rotulo: t`Declaração de frequência` },
    { valor: 'GUIA_TRANSFERENCIA', rotulo: t`Guia de transferência` },
    { valor: 'CERTIFICADO_HABILITACOES', rotulo: t`Certificado de habilitações` },
  ]
  const opcoesEstado: { valor: EstadoDocumentoOficial; rotulo: string }[] = [
    { valor: 'VALIDO', rotulo: t`Válido` },
    { valor: 'ANULADO', rotulo: t`Anulado` },
  ]

  const etiquetas: EtiquetaFiltro[] = [
    ...(q ? [{ chave: 'q', nome: t`Pesquisa`, valor: q }] : []),
    ...(filtros.tipo
      ? [
          {
            chave: 'tipo',
            nome: t`Tipo`,
            valor: opcoesTipo.find((o) => o.valor === filtros.tipo)?.rotulo ?? filtros.tipo,
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
  ]

  function retirarFiltro(chave: string) {
    if (chave === 'q') {
      clearTimeout(espera.current)
      setTexto('')
    }
    void navigate({ search: (s) => ({ ...s, [chave]: undefined, page: 1 }) })
  }

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-titulo-pagina">
            <Trans>Documentos</Trans>
          </h1>
          <p className="tabular text-secundario text-texto-2" aria-live="polite">
            {plural(total, { one: '# documento emitido', other: '# documentos emitidos' })}
          </p>
        </div>
        {podeEmitir && anoLectivoId && (
          <div className="flex flex-wrap gap-2">
            <EmitirEmLote anoLectivoId={anoLectivoId} />
            <EmitirDocumentoGlobal anoLectivoId={anoLectivoId} />
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_16rem_12rem]">
        <Campo rotulo={t`Pesquisar`}>
          {(c) => (
            <Entrada
              {...c}
              type="search"
              data-atalho="pesquisa"
              placeholder={t`Estudante, processo, número ou código`}
              prefixo={<Search aria-hidden />}
              value={texto}
              onChange={(e) => pesquisar(e.target.value)}
            />
          )}
        </Campo>
        <Campo rotulo={t`Tipo`}>
          {(c) => (
            <Selector
              {...c}
              placeholder={t`Todos`}
              opcoes={opcoesTipo}
              valor={filtros.tipo ?? null}
              aoMudar={(tipo) =>
                void navigate({
                  search: (s) => ({
                    ...s,
                    tipo: (tipo ?? undefined) as TipoDocumentoOficial | undefined,
                    page: 1,
                  }),
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
                    estado: (estado ?? undefined) as EstadoDocumentoOficial | undefined,
                    page: 1,
                  }),
                })
              }
            />
          )}
        </Campo>
      </div>

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

      <div
        className={cn(
          'transition-opacity duration-(--duracao-padrao)',
          isPlaceholderData && 'opacity-60',
        )}
      >
        <TabelaDados
          rotulo={t`Documentos emitidos`}
          ordenacao={ordenacaoDoUrl(ordem)}
          aoMudarOrdenacao={(o) =>
            void navigate({ search: (s) => ({ ...s, ordem: ordemParaUrl(o), page: 1 }) })
          }
          colunas={colunas}
          dados={data?.documentos}
          idDaLinha={(d) => d.id}
          aCarregar={!data}
          erro={isError && !data}
          aoTentarDeNovo={() => void refetch()}
          aoAbrir={(d) =>
            void navigate({
              to: '/estudantes/$estudanteId',
              params: { estudanteId: d.estudanteId },
              search: { separador: 'oficiais' },
            })
          }
          vazio={
            temFiltros ? (
              <EstadoVazio
                variante="sem-resultados"
                titulo={t`Nenhum documento corresponde à pesquisa.`}
                descricao={t`Verifique o número ou retire um filtro.`}
                accao={
                  <Button asChild>
                    <Link to="/documentos" search={{ page: 1 }}>
                      <Trans>Limpar filtros</Trans>
                    </Link>
                  </Button>
                }
              />
            ) : (
              <EstadoVazio
                titulo={t`Ainda não foram emitidos documentos oficiais.`}
                descricao={t`Declarações, guias e certificados emitidos ficam aqui, com número e código de verificação.`}
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

      <DialogoAnular
        estudanteId={aAnular?.estudanteId ?? ''}
        documento={aAnular}
        aoFechar={() => setAAnular(undefined)}
      />
    </section>
  )
}

function DocumentosEsqueleto() {
  const { t } = useLingui()
  return (
    <section className="flex flex-col gap-6" aria-busy="true" aria-label={t`A carregar documentos`}>
      <Esqueleto className="h-[34px] w-48" />
      <Esqueleto className="h-14 w-full" />
      <Esqueleto className="h-96 w-full" />
    </section>
  )
}
