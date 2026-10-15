import { Trans } from '@lingui/react/macro'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/shared/ui'

export const Route = createFileRoute('/_app/')({
  component: Inicio,
})

function Inicio() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-titulo-pagina">
        <Trans>Início</Trans>
      </h1>
      <p className="text-texto-2">
        <Trans>O painel com indicadores e pendências do dia chega aqui.</Trans>
      </p>
      <div className="mt-4">
        <Button variante="primario" asChild>
          <Link to="/turmas">
            <Trans>Ver turmas</Trans>
          </Link>
        </Button>
      </div>
    </section>
  )
}
