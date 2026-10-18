import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as z from 'zod/mini'
import {
  contasQuery,
  perfisQuery,
  rotuloEstadoUtilizador,
  type Conta,
  type EstadoUtilizador,
} from '@/entities/administracao'
import { meQuery } from '@/entities/utilizador'
import { BotaoEstadoUtilizador } from '@/features/alterar-estado-utilizador'
import { TEMPOS } from '@/shared/config/constantes'
import { esperarSoAoEntrar } from '@/shared/lib/carregar-rota'
import { cn } from '@/shared/lib/cn'
import { formatarInstante } from '@/shared/lib/datas'
import { useCan } from '@/shared/lib/permissoes'
import {
  Avatar,
  Campo,
  colunasDe,
  Entrada,
  ErroDeRota,
  EstadoVazio,
  EtiquetaEstado,
  EtiquetasFiltro,
  Selector,
  TabelaDados,
  type ColunaTabela,
  type EtiquetaFiltro,
} from '@/shared/ui'

const ESTADOS = ['ACTIVO', 'INACTIVO'] as const

const pesquisaUtilizadores = z.object({
  q: z.catch(z.optional(z.string()), undefined),
  perfilId: z.catch(z.optional(z.string()), undefined),
  estado: z.catch(z.optional(z.enum(ESTADOS)), undefined),
})

export const Route = createFileRoute('/_app/definicoes/utilizadores')({
  validateSearch: pesquisaUtilizadores,
  loader: ({ context: { queryClient }, location, cause }) => {
    const { q, ...resto } = pesquisaUtilizadores.parse(location.search)
    return esperarSoAoEntrar(
      cause,
      Promise.all([
        queryClient.ensureQueryData(contasQuery({ pesquisa: q, ...resto })),
        queryClient.ensureQueryData(perfisQuery()),
      ]),
    )
  },
  errorComponent: ErroDeRota,
  component: EcraUtilizadores,
})

function useColunas(podeAlterar: boolean, euId: string | undefined): ColunaTabela<Conta>[] {
  const { t } = useLingui()
  return useMemo(() => {
    const c = colunasDe<Conta>()
    return [
      c.accessor('nome', {
        header: t`Nome`,
        cell: (info) => (
          <span className="flex items-center gap-3">
            <Avatar nome={info.getValue()} tamanho="pequeno" />
            <span className="flex flex-col">
              <span className="font-medium">
                {info.getValue()}
                {info.row.original.id === euId && (
                  <span className="font-normal text-texto-3">
                    {' '}
                    <Trans>(a sua conta)</Trans>
                  </span>
                )}
              </span>
              <span className="text-secundario text-texto-2">{info.row.original.email}</span>
            </span>
          </span>
        ),
      }),
      c.accessor('perfil', { header: t`Perfil` }),
      c.accessor('ultimoAcesso', {
        header: t`Último acesso`,
        cell: (info) => {
          const v = info.getValue()
          return <span className="tabular text-texto-2">{v ? formatarInstante(v) : t`Nunca`}</span>
        },
      }),
      c.accessor('estadoRotulo', {
        header: t`Estado`,
        cell: (info) => (
          <EtiquetaEstado tom={info.row.original.estadoTom}>{info.getValue()}</EtiquetaEstado>
        ),
      }),
      ...(podeAlterar
        ? [
            c.display({
              id: 'accoes',
              header: () => (
                <span className="sr-only">
                  <Trans>Acções</Trans>
                </span>
              ),
              cell: (info) =>
                // A própria conta não se desactiva: o botão nem aparece (guia 2.7)
                info.row.original.id === euId ? null : (
                  <span className="flex justify-end">
                    <BotaoEstadoUtilizador conta={info.row.original} />
                  </span>
                ),
            }),
          ]
        : []),
    ]
  }, [t, podeAlterar, euId])
}

/** Utilizadores (guia 2.5): quem tem acesso, com que perfil e se a conta está activa. */
function EcraUtilizadores() {
  const { t } = useLingui()
  const { q, ...filtros } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [texto, setTexto] = useState(q ?? '')
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(espera.current), [])
  const podeAlterar = useCan('administracao:escrever')
  const { data: eu } = useQuery(meQuery())
  const { data: perfis = [] } = useQuery(perfisQuery())
  const { data, isPlaceholderData, isError, refetch } = useQuery(
    contasQuery({ pesquisa: q, ...filtros }),
  )
  const colunas = useColunas(podeAlterar, eu?.id)
  const total = data?.length ?? 0
  const temFiltros = Boolean(q || filtros.perfilId || filtros.estado)

  const opcoesEstado = ESTADOS.map((e) => ({ valor: e, rotulo: rotuloEstadoUtilizador(e) }))
  const etiquetas: EtiquetaFiltro[] = [
    ...(q ? [{ chave: 'q', nome: t`Pesquisa`, valor: q }] : []),
    ...(filtros.perfilId
      ? [
          {
            chave: 'perfilId',
            nome: t`Perfil`,
            valor: perfis.find((p) => p.id === filtros.perfilId)?.nome ?? filtros.perfilId,
          },
        ]
      : []),
    ...(filtros.estado
      ? [{ chave: 'estado', nome: t`Estado`, valor: rotuloEstadoUtilizador(filtros.estado) }]
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
        void navigate({ search: (s) => ({ ...s, q: valor.trim() || undefined }), replace: true }),
      TEMPOS.pesquisaEspera,
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-titulo-seccao">
          <Trans>Utilizadores</Trans>
        </h2>
        <p className="tabular text-secundario text-texto-2" aria-live="polite">
          {plural(total, { one: '# utilizador', other: '# utilizadores' })}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_14rem_12rem]">
        <Campo rotulo={t`Pesquisar`}>
          {(c) => (
            <Entrada
              {...c}
              type="search"
              data-atalho="pesquisa"
              placeholder={t`Nome ou email`}
              prefixo={<Search aria-hidden />}
              value={texto}
              onChange={(e) => pesquisar(e.target.value)}
            />
          )}
        </Campo>
        <Campo rotulo={t`Perfil`}>
          {(c) => (
            <Selector
              {...c}
              placeholder={t`Todos`}
              opcoes={perfis.map((p) => ({ valor: p.id, rotulo: p.nome }))}
              valor={filtros.perfilId ?? null}
              aoMudar={(perfilId) =>
                void navigate({ search: (s) => ({ ...s, perfilId: perfilId ?? undefined }) })
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
                    estado: (estado ?? undefined) as EstadoUtilizador | undefined,
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
          void navigate({ search: (s) => ({ ...s, [chave]: undefined }) })
        }}
        aoLimpar={() => {
          limparTexto()
          void navigate({ search: {} })
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
          rotulo={t`Utilizadores`}
          semOrdenacao
          colunas={colunas}
          dados={data}
          idDaLinha={(c) => c.id}
          aCarregar={!data}
          erro={isError && !data}
          aoTentarDeNovo={() => void refetch()}
          vazio={
            temFiltros ? (
              <EstadoVazio
                variante="sem-resultados"
                titulo={t`Nenhum utilizador corresponde à pesquisa.`}
                descricao={t`Verifique o nome ou retire um filtro.`}
              />
            ) : (
              <EstadoVazio titulo={t`Ainda não há utilizadores.`} />
            )
          }
        />
      </div>
    </div>
  )
}
