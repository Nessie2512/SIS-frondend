import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { anosLectivosQuery } from '@/entities/ano-lectivo'
import { RenovacaoMatriculas } from '@/features/renovar-matriculas'
import { useCan } from '@/shared/lib/permissoes'
import { Button, ErroDeRota, Esqueleto, EstadoVazio } from '@/shared/ui'

export const Route = createFileRoute('/_app/matriculas/renovar')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(anosLectivosQuery()),
  errorComponent: ErroDeRota,
  component: EcraRenovacao,
})

/** Renovação de matrículas em lote (guia 2.3, 2.5): página própria, por ser um fluxo longo. */
function EcraRenovacao() {
  const { t } = useLingui()
  const pode = useCan('matriculas:escrever')
  const { data: anos } = useQuery(anosLectivosQuery())
  if (!anos) return <Esqueleto className="h-96 w-full" />
  const destino = anos.find((a) => a.estado === 'PLANEADO')
  const designacao = destino?.designacao ?? ''

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          to="/matriculas"
          search={{ page: 1 }}
          className="-ml-1 flex w-fit items-center gap-1 text-secundario text-acento"
        >
          <ChevronLeft aria-hidden className="size-4 stroke-[1.5]" />
          <Trans>Matrículas</Trans>
        </Link>
        <h1 className="text-titulo-pagina">
          <Trans>Renovação de matrículas</Trans>
        </h1>
        {destino && (
          <p className="text-secundario text-texto-2">
            {t`Para ${designacao}. Os aprovados passam à classe seguinte; os reprovados repetem.`}
          </p>
        )}
      </div>
      {!destino ? (
        <EstadoVazio
          titulo={t`Ainda não há ano seguinte para onde renovar.`}
          descricao={t`Crie primeiro o próximo ano lectivo; a renovação é uma das etapas da abertura.`}
          accao={
            <Button asChild>
              <Link to="/anos-lectivos">
                <Trans>Ir para Anos lectivos</Trans>
              </Link>
            </Button>
          }
        />
      ) : !pode ? (
        <EstadoVazio titulo={t`Não tem permissão para renovar matrículas.`} />
      ) : (
        <RenovacaoMatriculas destino={destino} />
      )}
    </section>
  )
}
