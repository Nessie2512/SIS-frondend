import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { anosLectivosQuery, SelectorAno, useContextoAno } from '@/entities/ano-lectivo'
import { ErroDeRota } from '@/shared/ui'

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

const ligacao =
  'rounded-controlo px-3 py-1.5 text-texto-2 transition-colors duration-(--duracao-micro) hover:text-texto-1 data-[status=active]:bg-fundo data-[status=active]:text-texto-1'

function Layout() {
  return (
    <div className="min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-controlo focus:bg-superficie focus:px-3 focus:py-2"
      >
        Saltar para o conteúdo
      </a>
      <header className="sticky top-0 z-10 border-b border-linha bg-superficie/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
          <span className="text-subtitulo">Secretaria</span>
          <nav aria-label="Principal" className="flex items-center gap-1 text-corpo">
            <Link to="/" className={ligacao} activeOptions={{ exact: true }}>
              Início
            </Link>
            <Link to="/turmas" className={ligacao}>
              Turmas
            </Link>
          </nav>
          <div className="ml-auto">
            <SelectorAno />
          </div>
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
