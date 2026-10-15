import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery, type QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { anosLectivosQuery, SelectorAno, useContextoAno } from '@/entities/ano-lectivo'
import { mostrarAtalho } from '@/shared/lib/atalhos'
import { Aviso, ErroDeRota } from '@/shared/ui'
import { abrirPaleta, Casca, FaixaSemLigacao } from './-casca/casca'
import { MenuPreferencias } from './-casca/menu-preferencias'

export interface ContextoRouter {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<ContextoRouter>()({
  // Resolve o ano lectivo em contexto antes de qualquer rota: todas as listas o assumem (guia 2.5)
  beforeLoad: async ({ context }) => {
    const anos = await context.queryClient.ensureQueryData(anosLectivosQuery())
    const guardado = useContextoAno.getState().anoLectivoId
    const valido = anos.find((a) => a.id === guardado)
    const escolhido = valido ?? anos.find((a) => a.estado === 'EM_CURSO') ?? anos[0]
    if (escolhido && escolhido.id !== guardado) useContextoAno.getState().escolher(escolhido.id)
    return { anoLectivoId: escolhido?.id ?? null }
  },
  component: Layout,
  errorComponent: ErroDeRota,
})

const classesLigacao =
  'rounded-controlo px-3 py-1.5 text-texto-2 transition-colors duration-(--duracao-micro) hover:text-texto-1 data-[status=active]:bg-fundo data-[status=active]:text-texto-1'

function Layout() {
  const { t } = useLingui()
  const { data: anos = [] } = useQuery(anosLectivosQuery())
  const anoLectivoId = useContextoAno((e) => e.anoLectivoId)
  const ano = anos.find((a) => a.id === anoLectivoId)
  const designacao = ano?.designacao

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
    </div>
  )
}
