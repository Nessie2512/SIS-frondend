import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { anosLectivosQuery, TOM_ESTADO_ANO } from '@/entities/ano-lectivo'
import { NovoAnoLectivo } from '@/features/gerir-ano-lectivo'
import { formatarDataCivil } from '@/shared/lib/datas'
import { useCan } from '@/shared/lib/permissoes'
import { ErroDeRota, Esqueleto, EtiquetaEstado } from '@/shared/ui'

export const Route = createFileRoute('/_app/anos-lectivos/')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(anosLectivosQuery()),
  errorComponent: ErroDeRota,
  component: EcraAnosLectivos,
})

/** Anos lectivos (guia 2.2, 2.3): o ciclo de cada ano, do planeado ao encerrado. */
function EcraAnosLectivos() {
  const { t } = useLingui()
  const navigate = useNavigate()
  const podeGerir = useCan('anos:gerir')
  const { data: anos } = useQuery(anosLectivosQuery())
  if (!anos) return <Esqueleto className="h-64 w-full" />
  const ordenados = [...anos].sort((a, b) => b.dataInicio.localeCompare(a.dataInicio))
  const temPlaneado = anos.some((a) => a.estado === 'PLANEADO')

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-titulo-pagina">
            <Trans>Anos lectivos</Trans>
          </h1>
          <p className="text-secundario text-texto-2">
            <Trans>Só um ano está em curso de cada vez. O seguinte prepara-se por etapas.</Trans>
          </p>
        </div>
        {podeGerir && !temPlaneado && ordenados[0] && (
          <NovoAnoLectivo
            ultimo={ordenados[0]}
            aoCriar={(ano) =>
              void navigate({ to: '/anos-lectivos/$anoId', params: { anoId: ano.id } })
            }
          />
        )}
      </div>
      <ul aria-label={t`Anos lectivos`} className="grid gap-4 md:grid-cols-2">
        {ordenados.map((ano) => {
          const designacao = ano.designacao
          const estado = ano.estadoRotulo
          const de = formatarDataCivil(ano.dataInicio)
          const ate = formatarDataCivil(ano.dataFim)
          return (
            <li key={ano.id}>
              <Link
                to="/anos-lectivos/$anoId"
                params={{ anoId: ano.id }}
                aria-label={t`Ano lectivo ${designacao}, ${estado}`}
                className="flex h-full flex-col gap-2 rounded-cartao bg-superficie p-4 ring-1 ring-linha outline-none hover:ring-contorno focus-visible:ring-2 focus-visible:ring-acento"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="tabular text-subtitulo">{designacao}</span>
                  <EtiquetaEstado tom={TOM_ESTADO_ANO[ano.estado]}>
                    {ano.estadoRotulo}
                  </EtiquetaEstado>
                </span>
                <span className="tabular text-secundario text-texto-2">{t`De ${de} a ${ate}`}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
