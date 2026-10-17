import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { anosLectivosQuery, TOM_ESTADO_ANO } from '@/entities/ano-lectivo'
import { AberturaAno, EncerramentoAno, ReabrirAno } from '@/features/gerir-ano-lectivo'
import { formatarDataCivil } from '@/shared/lib/datas'
import { useCan } from '@/shared/lib/permissoes'
import { Aviso, ErroDeRota, Esqueleto, EstadoVazio, EtiquetaEstado } from '@/shared/ui'

export const Route = createFileRoute('/_app/anos-lectivos/$anoId')({
  loader: async ({ context: { queryClient }, params: { anoId } }) => {
    const anos = await queryClient.ensureQueryData(anosLectivosQuery())
    if (!anos.some((a) => a.id === anoId)) throw notFound()
  },
  errorComponent: ErroDeRota,
  notFoundComponent: () => <EstadoVazio variante="sem-resultados" titulo="—" />,
  component: EcraAnoLectivo,
})

/** Um ano lectivo e o que se faz com ele no estado em que está (guia 2.2). */
function EcraAnoLectivo() {
  const { t } = useLingui()
  const { anoId } = Route.useParams()
  const podeGerir = useCan('anos:gerir')
  const { data: anos } = useQuery(anosLectivosQuery())
  const ano = anos?.find((a) => a.id === anoId)
  if (!ano) return <Esqueleto className="h-96 w-full" />
  const designacao = ano.designacao
  const de = formatarDataCivil(ano.dataInicio)
  const ate = formatarDataCivil(ano.dataFim)

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          to="/anos-lectivos"
          className="-ml-1 flex w-fit items-center gap-1 text-secundario text-acento"
        >
          <ChevronLeft aria-hidden className="size-4 stroke-[1.5]" />
          <Trans>Anos lectivos</Trans>
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="tabular text-titulo-pagina">{t`Ano lectivo ${designacao}`}</h1>
          <EtiquetaEstado tom={TOM_ESTADO_ANO[ano.estado]}>{ano.estadoRotulo}</EtiquetaEstado>
        </div>
        <p className="tabular text-secundario text-texto-2">{t`De ${de} a ${ate}`}</p>
      </div>

      {ano.estado === 'PLANEADO' && <AberturaAno ano={ano} podeGerir={podeGerir} />}
      {ano.estado === 'EM_CURSO' && <EncerramentoAno ano={ano} podeGerir={podeGerir} />}
      {ano.estado === 'ENCERRADO' && (
        <div className="flex flex-col gap-4">
          <Aviso tom="leitura">
            <Trans>
              Este ano está encerrado: turmas, matrículas e resultados ficam só para consulta.
            </Trans>
          </Aviso>
          {podeGerir && (
            <div>
              <ReabrirAno ano={ano} />
            </div>
          )}
        </div>
      )}
    </section>
  )
}
