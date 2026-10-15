import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useEffect } from 'react'
import { anosLectivosQuery, SelectorAno, useContextoAno } from '@/entities/ano-lectivo'
import { garantirSessao, meQuery, utilizadorKeys } from '@/entities/utilizador'
import { eventosApi, sessao } from '@/shared/api'
import { mostrarAtalho } from '@/shared/lib/atalhos'
import { usePermissoesStore } from '@/shared/lib/permissoes'
import { Aviso } from '@/shared/ui'
import { abrirPaleta, Casca, FaixaSemLigacao } from './-casca/casca'
import { MenuPreferencias } from './-casca/menu-preferencias'
import { MenuUtilizador } from './-casca/menu-utilizador'
import { ProteccaoSessao } from './-casca/proteccao-sessao'

/**
 * Área autenticada. Sem sessão em memória tenta uma renovação silenciosa (cookie);
 * se falhar, vai para /entrar e volta depois à mesma rota (guia 2.6, 4.4).
 */
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    if (!(await garantirSessao())) {
      throw redirect({ to: '/entrar', search: { voltar: location.href } })
    }
    const [eu, anos] = await Promise.all([
      context.queryClient.ensureQueryData(meQuery()),
      context.queryClient.ensureQueryData(anosLectivosQuery()),
    ])
    usePermissoesStore.getState().definir(eu.permissoes)

    // Ano lectivo em contexto: todas as listas o assumem (guia 2.5)
    const guardado = useContextoAno.getState().anoLectivoId
    const valido = anos.find((a) => a.id === guardado)
    const escolhido = valido ?? anos.find((a) => a.estado === 'EM_CURSO') ?? anos[0]
    if (escolhido && escolhido.id !== guardado) useContextoAno.getState().escolher(escolhido.id)
    return { anoLectivoId: escolhido?.id ?? null, soLeitura: escolhido?.soLeitura ?? false }
  },
  component: LayoutApp,
})

const classesLigacao =
  'rounded-controlo px-3 py-1.5 text-texto-2 transition-colors duration-(--duracao-micro) hover:text-texto-1 data-[status=active]:bg-fundo data-[status=active]:text-texto-1'

function LayoutApp() {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const router = useRouter()
  const { data: anos = [] } = useQuery(anosLectivosQuery())
  const { data: eu } = useQuery(meQuery())
  const anoLectivoId = useContextoAno((e) => e.anoLectivoId)
  const ano = anos.find((a) => a.id === anoLectivoId)
  const designacao = ano?.designacao

  // Permissões actualizadas sempre que /auth/me muda (guia 2.7)
  useEffect(() => {
    if (eu) usePermissoesStore.getState().definir(eu.permissoes)
  }, [eu])

  // Depois de um 403, as permissões em memória estão desactualizadas: voltar a pedir
  useEffect(
    () =>
      eventosApi.aoPermissaoNegada(
        () => void queryClient.invalidateQueries({ queryKey: utilizadorKeys.me }),
      ),
    [queryClient],
  )

  // Saída de sessão (aqui ou noutro separador): limpar dados pessoais da memória e ir para a entrada
  useEffect(
    () =>
      sessao.aoTerminar((motivo) => {
        if (motivo !== 'saida') return
        queryClient.clear()
        usePermissoesStore.getState().limpar()
        void router.navigate({ to: '/entrar' })
      }),
    [queryClient, router],
  )

  return (
    <div className="min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-controlo focus:bg-superficie focus:px-3 focus:py-2"
      >
        <Trans>Saltar para o conteúdo</Trans>
      </a>
      <header className="sticky top-0 z-20 border-b border-linha bg-superficie/80 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
          <span className="text-subtitulo">
            <Trans>Secretaria</Trans>
          </span>
          <nav aria-label={t`Principal`} className="flex items-center gap-1 text-corpo">
            <Link to="/" className={classesLigacao} activeOptions={{ exact: true }}>
              <Trans>Início</Trans>
            </Link>
            <Link to="/turmas" className={classesLigacao}>
              <Trans>Turmas</Trans>
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={abrirPaleta}
              className="hidden h-8 items-center gap-2 rounded-full px-3 text-secundario text-texto-3 ring-1 ring-linha hover:text-texto-1 sm:flex"
            >
              <Search aria-hidden className="size-4 stroke-[1.5]" />
              <Trans>Procurar ou agir</Trans>
              <kbd className="tabular text-legenda">{mostrarAtalho('mod+k')}</kbd>
            </button>
            <SelectorAno />
            <MenuPreferencias />
            <MenuUtilizador />
          </div>
        </div>
        <FaixaSemLigacao />
        {ano?.soLeitura && (
          <Aviso tom="leitura" forma="faixa">
            {t`O ano lectivo ${designacao} está encerrado. Só é possível consultar.`}
          </Aviso>
        )}
      </header>
      <main id="conteudo" className="mx-auto max-w-6xl px-6 py-8 print:max-w-none print:p-0">
        <Outlet />
      </main>
      <Casca />
      <ProteccaoSessao />
    </div>
  )
}
