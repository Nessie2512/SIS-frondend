import { i18n } from '@lingui/core'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as z from 'zod/mini'
import {
  ACCOES_AUDITORIA,
  auditoriaQuery,
  type AccaoAuditoria,
  type EntradaAuditoria,
} from '@/entities/administracao'
import { TEMPOS } from '@/shared/config/constantes'
import { esperarSoAoEntrar } from '@/shared/lib/carregar-rota'
import { cn } from '@/shared/lib/cn'
import { formatarInstante } from '@/shared/lib/datas'
import {
  Button,
  Campo,
  colunasDe,
  Entrada,
  ErroDeRota,
  EstadoVazio,
  EtiquetasFiltro,
  Selector,
  TabelaDados,
  type ColunaTabela,
  type EtiquetaFiltro,
} from '@/shared/ui'

const ACCOES = Object.keys(ACCOES_AUDITORIA) as AccaoAuditoria[]

const pesquisaAuditoria = z.object({
  q: z.catch(z.optional(z.string()), undefined),
  accao: z.catch(z.optional(z.enum(ACCOES as [AccaoAuditoria, ...AccaoAuditoria[]])), undefined),
  page: z.catch(z._default(z.int().check(z.minimum(1)), 1), 1),
})

export const Route = createFileRoute('/_app/definicoes/auditoria')({
  validateSearch: pesquisaAuditoria,
  loader: ({ context: { queryClient }, location, cause }) => {
    const { q, ...resto } = pesquisaAuditoria.parse(location.search)
    return esperarSoAoEntrar(
      cause,
      queryClient.ensureQueryData(auditoriaQuery({ pesquisa: q, ...resto })),
    )
  },
  errorComponent: ErroDeRota,
  component: EcraAuditoria,
})

function useColunas(): ColunaTabela<EntradaAuditoria>[] {
  const { t } = useLingui()
  return useMemo(() => {
    const c = colunasDe<EntradaAuditoria>()
    return [
      c.accessor('quando', {
        header: t`Quando`,
        cell: (info) => (
          <span className="tabular whitespace-nowrap text-texto-2">
            {formatarInstante(info.getValue())}
          </span>
        ),
      }),
      c.accessor('utilizador', {
        header: t`Quem`,
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      c.accessor('accaoRotulo', { header: t`Acção` }),
      c.accessor('recurso', { header: t`Sobre` }),
      c.accessor('detalhe', {
        header: t`Detalhe`,
        cell: (info) => <span className="text-texto-2">{info.getValue()}</span>,
      }),
    ]
  }, [t])
}

/** Auditoria (guia 2.5, 2.6): quem fez o quê e quando. Só leitura; nada aqui se apaga. */
function EcraAuditoria() {
  const { t } = useLingui()
  const { q, ...filtros } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [texto, setTexto] = useState(q ?? '')
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(espera.current), [])
  const { data, isPlaceholderData, isError, refetch } = useQuery(
    auditoriaQuery({ pesquisa: q, ...filtros }),
  )
  const colunas = useColunas()
  const total = data?.total ?? 0
  const pagina = data?.page ?? filtros.page
  const totalPaginas = data?.totalPaginas ?? 1
  const temFiltros = Boolean(q || filtros.accao)

  const opcoesAccao = ACCOES.map((a) => ({ valor: a, rotulo: i18n._(ACCOES_AUDITORIA[a]) }))
  const etiquetas: EtiquetaFiltro[] = [
    ...(q ? [{ chave: 'q', nome: t`Pesquisa`, valor: q }] : []),
    ...(filtros.accao
      ? [{ chave: 'accao', nome: t`Acção`, valor: i18n._(ACCOES_AUDITORIA[filtros.accao]) }]
      : []),
  ]

  function limparTexto() {
    clearTimeout(espera.current)
    setTexto('')
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-titulo-seccao">
          <Trans>Auditoria</Trans>
        </h2>
        <p className="tabular text-secundario text-texto-2" aria-live="polite">
          {t`${total} registos`}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
        <Campo rotulo={t`Pesquisar`}>
          {(c) => (
            <Entrada
              {...c}
              type="search"
              data-atalho="pesquisa"
              placeholder={t`Pessoa, recurso ou detalhe`}
              prefixo={<Search aria-hidden />}
              value={texto}
              onChange={(e) => pesquisar(e.target.value)}
            />
          )}
        </Campo>
        <Campo rotulo={t`Acção`}>
          {(c) => (
            <Selector
              {...c}
              placeholder={t`Todas`}
              opcoes={opcoesAccao}
              valor={filtros.accao ?? null}
              aoMudar={(accao) =>
                void navigate({
                  search: (s) => ({
                    ...s,
                    accao: (accao ?? undefined) as AccaoAuditoria | undefined,
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
        aoRemover={(chave) => {
          if (chave === 'q') limparTexto()
          void navigate({ search: (s) => ({ ...s, [chave]: undefined, page: 1 }) })
        }}
        aoLimpar={() => {
          limparTexto()
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
          rotulo={t`Registo de auditoria`}
          semOrdenacao
          colunas={colunas}
          dados={data?.entradas}
          idDaLinha={(e) => e.id}
          aCarregar={!data}
          erro={isError && !data}
          aoTentarDeNovo={() => void refetch()}
          vazio={
            temFiltros ? (
              <EstadoVazio
                variante="sem-resultados"
                titulo={t`Nenhum registo corresponde à pesquisa.`}
                descricao={t`Retire um filtro ou pesquise por outra palavra.`}
              />
            ) : (
              <EstadoVazio titulo={t`Ainda não há registos.`} />
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
    </div>
  )
}
