'use no memo' // TanStack Table expõe métodos sobre um objecto estável; o compilador não deve memorizar esta árvore

import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  useTable,
  type Row,
  type RowData,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/shared/lib/cn'
import { Button } from './button'
import { Esqueleto } from './esqueleto'
import { recursosTabela, type ColunaTabela, type Recursos } from './tabela-recursos'

/** Acima deste número de linhas a tabela virtualiza (guia 5.6, 7.1). */
const LIMIAR_VIRTUALIZACAO = 100

interface Props<T extends RowData> {
  rotulo: string
  colunas: ColunaTabela<T>[]
  dados: T[] | undefined
  idDaLinha: (linha: T) => string
  aCarregar?: boolean
  erro?: boolean
  aoTentarDeNovo?: () => void
  /** Estado vazio (primeira utilização ou filtro sem resultados) */
  vazio?: ReactNode
  /** Enter ou clique abre o painel de detalhe */
  aoAbrir?: (linha: T) => void
  /** Linha aberta no painel (vem do URL) */
  idActiva?: string
  /** Ordenação controlada (para viver no URL); sem ela, a tabela ordena sozinha */
  ordenacao?: SortingState
  aoMudarOrdenacao?: (ordenacao: SortingState) => void
  /** Selecção múltipla com barra de acções em lote */
  seleccionavel?: boolean
  accoesLote?: (ids: string[], limpar: () => void) => ReactNode
  /** Nome da linha para a caixa de selecção (ex.: o nome do estudante); sem ele, «Seleccionar linha» */
  nomeDaLinha?: (linha: T) => string
  /** Altura do contentor com scroll (necessária para virtualizar) */
  alturaMaxima?: number
  linhasEsqueleto?: number
  /** Listas paginadas no servidor: ordenar só a página actual engana, por isso desliga-se */
  semOrdenacao?: boolean
}

/**
 * Tabela de dados (guia 6.2, 6.3, 7.1): cabeçalho fixo, setas para navegar, Enter abre,
 * Espaço selecciona, ordenação com aria-sort, números tabulares e virtualização acima de 100 linhas.
 */
export function TabelaDados<T extends RowData>(props: Props<T>) {
  const { t } = useLingui()
  const {
    rotulo,
    dados,
    aCarregar,
    erro,
    aoTentarDeNovo,
    vazio,
    aoAbrir,
    idActiva,
    seleccionavel,
    accoesLote,
    nomeDaLinha,
  } = props
  const [ordenacaoInterna, setOrdenacaoInterna] = useState<SortingState>([])
  const [seleccao, setSeleccao] = useState<RowSelectionState>({})
  const [activa, setActiva] = useState(0)
  const contentor = useRef<HTMLDivElement>(null)
  const corpo = useRef<HTMLTableSectionElement>(null)

  const ordenacao = props.ordenacao ?? ordenacaoInterna
  const rotuloTodas = t`Seleccionar todas`
  const rotuloLinha = useCallback(
    (linha: T) => {
      const nome = nomeDaLinha?.(linha)
      return nome ? t`Seleccionar ${nome}` : t`Seleccionar linha`
    },
    [nomeDaLinha, t],
  )
  // Colunas estáveis: recriá-las a cada render remonta as células (e perde cliques a meio)
  const colunas = useMemo(
    () =>
      seleccionavel
        ? [colunaSeleccao<T>(rotuloTodas, rotuloLinha), ...props.colunas]
        : props.colunas,
    [seleccionavel, rotuloTodas, rotuloLinha, props.colunas],
  )

  const tabela = useTable({
    features: recursosTabela,
    columns: colunas,
    data: dados ?? SEM_DADOS,
    getRowId: (linha: T) => props.idDaLinha(linha),
    state: { sorting: ordenacao, rowSelection: seleccao },
    onSortingChange: (u) => {
      const proxima = typeof u === 'function' ? u(ordenacao) : u
      if (props.aoMudarOrdenacao) props.aoMudarOrdenacao(proxima)
      else setOrdenacaoInterna(proxima)
    },
    onRowSelectionChange: setSeleccao,
    enableRowSelection: Boolean(seleccionavel),
    enableSortingRemoval: true,
    enableSorting: !props.semOrdenacao,
    // Ordenação controlada por fora (listas paginadas): o servidor ordena, a tabela só mostra
    manualSorting: Boolean(props.aoMudarOrdenacao),
  })

  const linhas = tabela.getRowModel().rows
  const virtualizar = linhas.length > LIMIAR_VIRTUALIZACAO
  const alturaLinha = () =>
    Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--spacing-linha'),
    ) || 44
  // eslint-disable-next-line react-hooks/incompatible-library -- componente marcado com 'use no memo'
  const virtualizador = useVirtualizer({
    count: linhas.length,
    getScrollElement: () => contentor.current,
    estimateSize: alturaLinha,
    getItemKey: (i) => linhas[i]?.id ?? i,
    overscan: 8,
    enabled: virtualizar,
  })

  useEffect(() => {
    if (activa >= linhas.length) setActiva(Math.max(0, linhas.length - 1))
  }, [activa, linhas.length])

  function focarLinha(indice: number) {
    const alvo = Math.max(0, Math.min(linhas.length - 1, indice))
    setActiva(alvo)
    if (virtualizar) virtualizador.scrollToIndex(alvo)
    requestAnimationFrame(() =>
      corpo.current?.querySelector<HTMLTableRowElement>(`tr[data-indice="${alvo}"]`)?.focus(),
    )
  }

  function aoTeclar(e: KeyboardEvent, linha: Row<Recursos, T>, indice: number) {
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    const passo = { ArrowDown: 1, ArrowUp: -1, PageDown: 10, PageUp: -10 }[e.key]
    if (passo) {
      e.preventDefault()
      focarLinha(indice + passo)
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      focarLinha(e.key === 'Home' ? 0 : linhas.length - 1)
    } else if (e.key === 'Enter' && aoAbrir) {
      e.preventDefault()
      aoAbrir(linha.original)
    } else if (e.key === ' ' && seleccionavel) {
      e.preventDefault()
      linha.toggleSelected()
    }
  }

  const idsSeleccionados = Object.keys(seleccao)
  const nColunas = colunas.length
  const visiveis = virtualizar
    ? virtualizador.getVirtualItems().map((v) => ({ linha: linhas[v.index]!, indice: v.index }))
    : linhas.map((linha, indice) => ({ linha, indice }))
  const itens = virtualizador.getVirtualItems()
  const espacoAntes = virtualizar && itens.length ? (itens[0]?.start ?? 0) : 0
  const espacoDepois =
    virtualizar && itens.length ? virtualizador.getTotalSize() - (itens.at(-1)?.end ?? 0) : 0

  return (
    <div className="relative">
      <div
        ref={contentor}
        className="overflow-auto rounded-cartao bg-superficie ring-1 ring-linha"
        style={{ maxHeight: props.alturaMaxima ?? (virtualizar ? 600 : undefined) }}
      >
        <table
          aria-label={rotulo}
          aria-busy={aCarregar || undefined}
          className="w-full border-separate border-spacing-0 text-left"
        >
          <thead className="sticky top-0 z-10 bg-superficie text-legenda text-texto-3">
            {tabela.getHeaderGroups().map((grupo) => (
              <tr key={grupo.id}>
                {grupo.headers.map((cabecalho) => {
                  const coluna = cabecalho.column
                  const sentido = coluna.getIsSorted()
                  const ordenavel = coluna.getCanSort()
                  return (
                    <th
                      key={cabecalho.id}
                      scope="col"
                      aria-sort={
                        sentido === 'asc'
                          ? 'ascending'
                          : sentido === 'desc'
                            ? 'descending'
                            : undefined
                      }
                      className="h-9 border-b border-linha px-4 font-medium whitespace-nowrap"
                    >
                      {cabecalho.isPlaceholder ? null : ordenavel ? (
                        <button
                          type="button"
                          onClick={coluna.getToggleSortingHandler()}
                          className="-mx-1 inline-flex items-center gap-1 rounded-controlo px-1 hover:text-texto-1 [&_svg]:size-3.5 [&_svg]:stroke-[1.5]"
                        >
                          <tabela.FlexRender header={cabecalho} />
                          {sentido === 'asc' ? (
                            <ArrowUp aria-hidden />
                          ) : sentido === 'desc' ? (
                            <ArrowDown aria-hidden />
                          ) : (
                            <ArrowUpDown aria-hidden className="opacity-40" />
                          )}
                        </button>
                      ) : (
                        <tabela.FlexRender header={cabecalho} />
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody ref={corpo}>
            {aCarregar && !dados ? (
              Array.from({ length: props.linhasEsqueleto ?? 8 }, (_, i) => (
                <tr key={i} className="h-linha">
                  {Array.from({ length: nColunas }, (_, j) => (
                    <td key={j} className="border-b border-linha px-4">
                      <Esqueleto className="h-4 w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : erro ? (
              <tr>
                <td colSpan={nColunas} className="px-4 py-12 text-center">
                  <div role="alert" className="flex flex-col items-center gap-3">
                    <p className="text-subtitulo">
                      <Trans>Não foi possível carregar a lista.</Trans>
                    </p>
                    {aoTentarDeNovo && (
                      <Button onClick={aoTentarDeNovo}>
                        <Trans>Tentar de novo</Trans>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : linhas.length === 0 ? (
              <tr>
                <td colSpan={nColunas}>{vazio}</td>
              </tr>
            ) : (
              <>
                {espacoAntes > 0 && (
                  <tr aria-hidden style={{ height: espacoAntes }}>
                    <td colSpan={nColunas} />
                  </tr>
                )}
                {visiveis.map(({ linha, indice }) => (
                  <tr
                    key={linha.id}
                    data-indice={indice}
                    tabIndex={indice === activa ? 0 : -1}
                    aria-selected={seleccionavel ? linha.getIsSelected() : undefined}
                    aria-current={linha.id === idActiva ? 'true' : undefined}
                    onKeyDown={(e) => aoTeclar(e, linha, indice)}
                    onFocus={() => setActiva(indice)}
                    onClick={() => aoAbrir?.(linha.original)}
                    className={cn(
                      'h-linha outline-none focus-visible:bg-acento/5 focus-visible:shadow-[inset_2px_0_0_var(--color-acento)]',
                      aoAbrir && 'cursor-pointer hover:bg-fundo',
                      linha.getIsSelected() && 'bg-acento/5',
                      linha.id === idActiva && 'bg-fundo',
                    )}
                  >
                    {linha.getAllCells().map((celula) => (
                      <td
                        key={celula.id}
                        className="border-b border-linha px-4 [tr:last-child_&]:border-0"
                      >
                        <tabela.FlexRender cell={celula} />
                      </td>
                    ))}
                  </tr>
                ))}
                {espacoDepois > 0 && (
                  <tr aria-hidden style={{ height: espacoDepois }}>
                    <td colSpan={nColunas} />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {seleccionavel && idsSeleccionados.length > 0 && (
        <div
          role="toolbar"
          aria-label={t`Acções em lote`}
          className="fixed bottom-6 left-[calc(50%+var(--largura-menu,0px)/2)] z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-superficie/90 py-2 pr-2 pl-4 shadow-flutuante ring-1 ring-linha backdrop-blur-xl data-[state=open]:animate-desvanecer-entrar"
        >
          <span className="tabular text-corpo font-medium">
            {plural(idsSeleccionados.length, { one: '# seleccionado', other: '# seleccionados' })}
          </span>
          {accoesLote?.(idsSeleccionados, () => setSeleccao({}))}
          <Button tamanho="compacto" variante="discreto" onClick={() => setSeleccao({})}>
            <Trans>Limpar selecção</Trans>
          </Button>
        </div>
      )}
    </div>
  )
}

const SEM_DADOS: never[] = []

function colunaSeleccao<T extends RowData>(
  rotuloTodas: string,
  rotuloLinha: (linha: T) => string,
): ColunaTabela<T> {
  return {
    id: '_seleccao',
    enableSorting: false,
    header: ({ table }) => (
      <CaixaSeleccao
        aria-label={rotuloTodas}
        checked={table.getIsAllRowsSelected()}
        indeterminado={table.getIsSomeRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <CaixaSeleccao
        aria-label={rotuloLinha(row.original)}
        checked={row.getIsSelected()}
        readOnly
        onClick={(e) => {
          // O clique não abre a linha; Shift+clique selecciona um intervalo
          e.stopPropagation()
          row.getToggleSelectedHandler()(e)
        }}
      />
    ),
  }
}

function CaixaSeleccao({
  indeterminado,
  ...props
}: React.ComponentProps<'input'> & { indeterminado?: boolean }) {
  return (
    <input
      type="checkbox"
      ref={(el) => {
        if (el) el.indeterminate = Boolean(indeterminado) && !props.checked
      }}
      className="size-4 accent-(--color-acento)"
      {...props}
    />
  )
}
