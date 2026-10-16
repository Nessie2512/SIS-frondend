import { Trans, useLingui } from '@lingui/react/macro'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { useCan } from '@/shared/lib/permissoes'
import { ErroDeRota } from '@/shared/ui'

export const Route = createFileRoute('/_app/definicoes')({
  errorComponent: ErroDeRota,
  component: LayoutDefinicoes,
})

const classesSeparador =
  '-mb-px border-b-2 border-transparent px-1 pb-2.5 text-corpo whitespace-nowrap text-texto-2 outline-none hover:text-texto-1 focus-visible:ring-2 focus-visible:ring-acento data-[status=active]:border-acento data-[status=active]:font-medium data-[status=active]:text-texto-1'

/**
 * Definições (guia 2.5): preferências de cada um e, para quem administra, utilizadores,
 * perfis de acesso e auditoria (tabelas com filtros). Cada secção tem o seu endereço.
 */
function LayoutDefinicoes() {
  const { t } = useLingui()
  const administra = useCan('administracao:ler')
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-titulo-pagina">
        <Trans>Definições</Trans>
      </h1>
      <nav aria-label={t`Secções das definições`} className="border-b border-linha">
        <ul className="flex gap-6 overflow-x-auto">
          <li>
            <Link to="/definicoes" activeOptions={{ exact: true }} className={classesSeparador}>
              <Trans>Preferências</Trans>
            </Link>
          </li>
          {administra && (
            <>
              <li>
                <Link to="/definicoes/utilizadores" className={classesSeparador}>
                  <Trans>Utilizadores</Trans>
                </Link>
              </li>
              <li>
                <Link to="/definicoes/perfis" className={classesSeparador}>
                  <Trans>Perfis de acesso</Trans>
                </Link>
              </li>
              <li>
                <Link to="/definicoes/auditoria" className={classesSeparador}>
                  <Trans>Auditoria</Trans>
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
      <Outlet />
    </section>
  )
}
