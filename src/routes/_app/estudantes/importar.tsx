import { Trans, useLingui } from '@lingui/react/macro'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { anosLectivosQuery } from '@/entities/ano-lectivo'
import { classesQuery } from '@/entities/classe'
import { ImportarEstudantes } from '@/features/importar-estudantes'
import { TEMPOS } from '@/shared/config/constantes'
import { useCan } from '@/shared/lib/permissoes'
import { Aviso, ErroDeRota, Esqueleto, EstadoVazio } from '@/shared/ui'

export const Route = createFileRoute('/_app/estudantes/importar')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(classesQuery()),
      queryClient.ensureQueryData(anosLectivosQuery()),
    ]),
  pendingComponent: () => <Esqueleto className="h-96 w-full" />,
  pendingMs: TEMPOS.esqueletoAtraso,
  pendingMinMs: TEMPOS.esqueletoMinimo,
  errorComponent: ErroDeRota,
  component: EcraImportar,
})

/** Importação de estudantes a partir de um CSV (guia 2.1, 5.7). */
function EcraImportar() {
  const { t } = useLingui()
  const { anoLectivoId } = Route.useRouteContext()
  const { data: anos = [] } = useQuery(anosLectivosQuery())
  const pode = useCan('matriculas:escrever')
  const ano = anos.find((a) => a.id === anoLectivoId)
  const designacao = ano?.designacao ?? ''

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          to="/estudantes"
          search={{ page: 1 }}
          className="inline-flex min-h-6 w-fit items-center gap-1 text-secundario text-texto-2 hover:text-texto-1"
        >
          <ChevronLeft aria-hidden className="size-4" />
          <Trans>Estudantes</Trans>
        </Link>
        <h1 className="text-titulo-pagina">
          <Trans>Importar estudantes</Trans>
        </h1>
        {ano && <p className="text-secundario text-texto-2">{t`Matrículas em ${designacao}`}</p>}
      </div>
      {!ano ? (
        <EstadoVazio titulo={t`Ainda não há anos lectivos.`} />
      ) : !pode ? (
        <Aviso tom="leitura">{t`O seu perfil não permite importar estudantes.`}</Aviso>
      ) : ano.estado === 'ENCERRADO' ? (
        <Aviso tom="leitura">{t`${designacao} está encerrado: não aceita novas matrículas.`}</Aviso>
      ) : (
        <ImportarEstudantes anoLectivoId={ano.id} designacaoAno={designacao} />
      )}
    </section>
  )
}
