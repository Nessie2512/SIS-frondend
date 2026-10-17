import { Trans, useLingui } from '@lingui/react/macro'
import { createFileRoute } from '@tanstack/react-router'
import { catalogoQuery } from '@/entities/relatorio'
import { CatalogoRelatorios, ExportacoesRecentes } from '@/features/gerar-relatorio'
import { TEMPOS } from '@/shared/config/constantes'
import { ErroDeRota, Esqueleto, EstadoVazio } from '@/shared/ui'

export const Route = createFileRoute('/_app/relatorios')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(catalogoQuery()),
  pendingComponent: () => <Esqueleto className="h-96 w-full" />,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  component: Relatorios,
})

/** Relatórios (guia 2.5, 5.7): catálogo e exportações; cada pedido corre em segundo plano. */
function Relatorios() {
  const { t } = useLingui()
  const { anoLectivoId } = Route.useRouteContext()
  if (!anoLectivoId) {
    return <EstadoVazio titulo={t`Ainda não há anos lectivos.`} />
  }
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-titulo-pagina">
          <Trans>Relatórios</Trans>
        </h1>
        <p className="text-secundario text-texto-2">
          <Trans>
            Os relatórios são gerados em segundo plano: pode continuar a trabalhar e descarregar
            quando estiverem prontos.
          </Trans>
        </p>
      </div>
      <CatalogoRelatorios anoLectivoId={anoLectivoId} />
      <ExportacoesRecentes anoLectivoId={anoLectivoId} />
    </section>
  )
}
